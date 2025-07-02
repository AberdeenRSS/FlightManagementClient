// encoder.ts

import * as struct from 'python-struct';

const INT_SIZE = 4;    // Same as Python's struct calcsize('!i')
const DOUBLE_SIZE = 8; // Same as Python's struct calcsize('!d')

// Define a union type for the shape parameter. In our API, a shape may be:
// - A format string (e.g., "d", "i", "[d]" for an array of doubles)
// - The String constructor (to denote a UTF-8 encoded string)
// - An array of shapes. An array marked with the special “_isTuple” property is treated
//   as the Python tuple branch.
export type Shape = string | typeof String | Shape[];


/**
 * Recursively calculates the size (in bytes) required for the payload given
 * the shape and payload objects.
 *
 * @param shape - The schema or format specifier
 * @param payload - The payload that matches the shape
 * @param topLevel - Flag for whether we’re at the root level (defaults to true)
 * @returns The number of bytes required for the payload encoding
 */
export function calcPayloadSize(shape: Shape | undefined, payload: unknown, topLevel = true): number {

  if(!shape)
    return 0

  // For a format string.
  if (typeof shape === 'string') {

    // When the shape is the String constructor, encode the UTF-8 string.
    if (shape === '[str]') {
      const encodedStr: Buffer = Buffer.from(payload, 'utf8');
      const strLen: number = encodedStr.length;
      return topLevel ? strLen : (INT_SIZE + strLen);
    }

    // Handle the case of an array type encoded as a string like "[d]".
    if (shape.startsWith('[')) {
      let size = 0;
      const payloadLen = payload.length;
      if (!topLevel) {
        // Reserve INT_SIZE bytes for the array length (if not at the top level).
        size += INT_SIZE;
      }
      // Remove the surrounding brackets to get the inner format.
      const innerShape = shape.substring(1, shape.length - 1);
      for (let i = 0; i < payloadLen; i++) {
        size += calcPayloadSize(innerShape, payload[i], false);
      }
      return size;
    }
    // For simple scalar types.
    return struct.sizeOf('!' + shape);
  }



  if (Array.isArray(shape) && !Array.isArray(shape[0])) {
    return calcPayloadSize(shape[1], payload, false);
  }

  // For a collection (i.e. an array of shapes), sum the size of each element.
  if (Array.isArray(shape)) {
    let total = 0;
    for (let i = 0; i < shape.length; i++) {
      total += calcPayloadSize(shape[i], payload[i], false);
    }
    return total;
  }

  throw new Error('Unsupported shape type in calcPayloadSize');
}

/**
 * Recursively encodes the payload into a pre-allocated Buffer starting at the given offset.
 *
 * @param shape - The schema or format specifier
 * @param payload - The payload to encode
 * @param buffer  - The pre-allocated Buffer where data is written
 * @param offset  - The current offset into the buffer
 * @param topLevel - Flag indicating if the current level is the top level (default: true)
 * @returns A tuple containing the updated Buffer and new offset.
 */
export function encodePayloadInternal(shape: Shape | undefined, payload: unknown, buffer: Buffer, offset: number, topLevel = true): [Buffer, number] {

  
  if (typeof shape === 'string') {
  
      // When the shape equals the String constructor, encode the string.
    if (shape === '[str]') {
      const encodedStr: Buffer = Buffer.from(payload, 'utf8');
      const strLen: number = encodedStr.length;
      if (topLevel) {
          buffer.set(encodedStr, offset)
        offset += strLen;
        return [buffer, offset];
      }
      // First, write the length of the string.
      const lenPacked: Buffer = struct.pack('!i', strLen);
      buffer.set(lenPacked, offset)
      offset += INT_SIZE;
      buffer.set(encodedStr, offset);
      offset += strLen;
      return [buffer, offset];
    }

    // Handle the array (list) case where the format string starts with '['.
    if (shape.startsWith('[')) {
      const payloadLen: number = payload.length;
      if (!topLevel) {
        // Pack the array length using format '!i'
        const lenPacked: Buffer = struct.pack('!i', payloadLen);
        buffer.set(lenPacked, offset)
        offset += INT_SIZE;
      }
      const innerShape: string = shape.substring(1, shape.length - 1);
      for (let i = 0; i < payloadLen; i++) {
        [buffer, offset] = encodePayloadInternal(innerShape, payload[i], buffer, offset, false);
      }
      return [buffer, offset];
    }
    // For scalar types: if the payload is an array, use spread; otherwise, use it directly.
    let packed: Buffer;
    if (Array.isArray(payload)) {
      packed = struct.pack('!' + shape, ...payload);
    } else {
      packed = struct.pack('!' + shape, payload);
    }
    buffer.set(packed, offset)
    offset += struct.sizeOf('!' + shape);
    return [buffer, offset];
  }



  if (Array.isArray(shape) && !Array.isArray(shape[0])) {
    return encodePayloadInternal(shape[1], payload, buffer, offset, false);
  }

  // For a collection of shapes (regular arrays), iteratively encode each element.
  if (Array.isArray(shape)) {
    for (let i = 0; i < shape.length; i++) {
      [buffer, offset] = encodePayloadInternal(shape[i], payload[i], buffer, offset, false);
    }
    return [buffer, offset];
  }

  throw new Error('Unsupported shape type in encodePayloadInternal');
}

/**
 * Top-level function that encodes a payload.
 * It first allocates a Buffer, writes the time (as a big-endian double) into it,
 * then encodes the payload according to the specified shape.
 *
 * @param shape   - The schema or format specifier for the payload
 * @param time    - The time value (as a number) to be written at the beginning
 * @param payload - The payload to encode
 * @returns A Buffer containing the binary encoding.
 */
export function encodePayload(shape: Shape | undefined, time: number, payload: unknown): Buffer {
  // Determine the total size: time (DOUBLE_SIZE) plus the payload size.
  const totalSize: number = DOUBLE_SIZE + calcPayloadSize(shape, payload);
  const buffer: Buffer = Buffer.alloc(totalSize);

  // Encode the time (big-endian double) at the beginning using '!d'
  const timePacked: Buffer = struct.pack('!d', time);
  buffer.set(timePacked, 0);
  let offset: number = DOUBLE_SIZE;

  // Recursively encode the payload.
  [/* unused */, offset] = encodePayloadInternal(shape, payload, buffer, offset, true);
  return buffer;
}


/**
 * Decodes the encoded payload from a Buffer.
 * 
 * Reads the time (an 8‑byte big‑endian double) from the beginning and then
 * recursively decodes the rest of the data.
 *
 * @param shape - The schema or format specifier for the payload.
 * @param payload - The Buffer containing the encoded payload.
 * @returns A tuple of [time, decodedValue].
 */
export function decodePayload(shape: Shape, payload: Buffer): [number, unknown] {
  // Decode the time (first 8 bytes using big-endian double format).
  const timeBuf: Buffer = payload.slice(0, DOUBLE_SIZE);
  const timeArr: number[] = struct.unpack('!d', timeBuf) as number[];
  const time = timeArr[0];
  const offset = DOUBLE_SIZE;

  const [res, /* unused */] = decodePayloadInternal(shape, payload, offset, true);
  return [time, res];
}

/**
 * Recursively decodes the payload from a Buffer starting at a given offset.
 *
 * @param shape - The schema or format specifier.
 * @param payload - The Buffer that contains the encoded data.
 * @param offset - The current offset into the Buffer.
 * @param topLevel - True if at the top-level of decoding (default: true).
 * @returns A tuple of [decodedValue, newOffset].
 */
export function decodePayloadInternal(
  shape: Shape,
  payload: Buffer,
  offset: number,
  topLevel: boolean
): [unknown, number] {

  // Case 1: When the shape is a format string.
  if (typeof shape === 'string') {

    // Case 2: When the shape equals the String constructor (i.e. a UTF-8 string).
    if (shape === '[str]') {
      let strLen: number;
      if (topLevel) {
        // At the top level, use the rest of the payload.
        strLen = payload.length - offset;
      } else {
        // Otherwise, the length is stored as a 4-byte integer.
        const lenBuf: Buffer = payload.slice(offset, offset + INT_SIZE);
        const lenArr: number[] = struct.unpack('!i', lenBuf) as number[];
        strLen = lenArr[0];
        offset += INT_SIZE;
      }
      const strBuf: Buffer = payload.slice(offset, offset + strLen);
      const decodedStr: string = strBuf.toString('utf8');
      offset += strLen;
      return [decodedStr, offset];
    }

    // Array of data case (e.g., "[d]" indicates an array of doubles).
    if (shape.startsWith('[')) {
      const innerFormat: string = shape.substring(1, shape.length - 1);
      let payloadLen: number;

      if (topLevel) {
        // At top level, compute the number of elements from the remaining size.
        payloadLen = Math.floor((payload.length - offset) / struct.sizeOf('!' + innerFormat));
      } else {
        // Otherwise, the payload length is stored as a 4-byte int.
        const lenBuf: Buffer = payload.slice(offset, offset + INT_SIZE);
        const lenArr: number[] = struct.unpack('!i', lenBuf) as number[];
        payloadLen = lenArr[0];
        offset += INT_SIZE;
      }

      const resArr: unknown[] = [];
      for (let i = 0; i < payloadLen; i++) {
        const [decoded, newOffset] = decodePayloadInternal(innerFormat, payload, offset, false);
        resArr.push(decoded);
        offset = newOffset;
      }
      return [resArr, offset];
    }

    // Non-array case: decode using struct.unpack.
    const size: number = struct.sizeOf('!' + shape);
    const buf: Buffer = payload.slice(offset, offset + size);
    const unpacked: unknown[] = struct.unpack('!' + shape, buf);
    offset += size;
    const result: unknown = (unpacked.length === 1) ? unpacked[0] : unpacked;
    return [result, offset];
  }



  // Case 3: Tuple branch – mimic Python’s tuple by using an array marked with _isTuple.
  if (Array.isArray(shape) && !Array.isArray(shape[0])) {
    return decodePayloadInternal(shape[1], payload, offset, false);
  }

  // Case 4: Collection of shapes (i.e. an array of shapes).
  if (Array.isArray(shape)) {
    const resArr: unknown[] = [];
    for (let i = 0; i < shape.length; i++) {
      const [decoded, newOffset] = decodePayloadInternal(shape[i], payload, offset, false);
      resArr.push(decoded);
      offset = newOffset;
    }
    return [resArr, offset];
  }

  throw new Error("Unsupported shape type in decodePayloadInternal");
}
