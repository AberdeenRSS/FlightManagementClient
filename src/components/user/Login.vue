<template>
    <v-sheet width="300" class="mx-auto">
        <v-form validate-on="input" @submit.prevent="submit">
            <v-text-field v-model="email" :rules="emailRules" label="Email"></v-text-field>
            <v-text-field v-model="password" :rules="pwRules" label="Password" type="password"></v-text-field>

            <v-btn type="submit" block class="mt-2" text="Login" :loading="authStatus.loading"></v-btn>
        </v-form>
        <v-alert v-if="loginError" :text="loginError" type="error"></v-alert>
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
const pwRules = [(pw: string) => pw.length > 7 || 'Password needs to be a minimum of 8 characters']

const email = ref<string>('')
const password = ref<string>('')


const { authStatus } = useUser()

const { login, loginError } = useRssOAuth()

const router = useRouter()

async function submit() {

    const success = await login(email.value, password.value)

    if (success)
        router.push('/')

}

</script>

<style lang="scss"></style>

