<template>
    <v-sheet width="300" class="mx-auto">
        <v-form validate-on="input" @submit.prevent="submit">
            <v-text-field v-model="userName" :rules="userNameRules" label="User name"></v-text-field>
            <v-text-field v-model="email" :rules="emailRules" label="Email"></v-text-field>
            <v-text-field v-model="password" :rules="pwRules" label="Password" type="password"></v-text-field>

            <v-btn type="submit" block class="mt-2" text="Register" :loading="authStatus.loading"></v-btn>
        </v-form>
        <v-alert v-if="registerError" :text="registerError" type="error"></v-alert>
    </v-sheet>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUser } from '@/composables/auth/useUser'
import { useRouter } from 'vue-router';
import { useRssOAuth } from '@/composables/auth/rss-oauth/useRssOAuth'

const validateEmail = (email: string) => {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\].,;:\s@\"]{2,})$/i
        );
};

const emailRules = [(email: string) => validateEmail(email) || 'Not a valid email address']
const userNameRules = [(userName: string) => userName.length > 0 || 'User name needs to be a minimum length of 1']
const pwRules = [(pw: string) => pw.length > 7 || 'Password needs to be a minimum of 8 characters']

const userName = ref<string>('')
const email = ref<string>('')
const password = ref<string>('')


const { authStatus } = useUser()

const { register, registerError } = useRssOAuth()

const router = useRouter()

async function submit() {

    const success = await register(userName.value, email.value, password.value)

    if (success)
        router.push('/')

}

</script>

<style lang="scss"></style>

