<template>
    <div class="flex justify-content-center">
        <Card class="login-card">
            <template #title>
                Login
            </template>
            <template #content>
                <form @submit.prevent="submit">
                    <div class="field">
                        <label for="email" class="block">Email</label>
                        <InputText id="email" v-model="email" :class="{'p-invalid': emailError}" class="w-full" />
                        <small v-if="emailError" class="p-error block">{{ emailError }}</small>
                    </div>
                    <div class="field mt-4">
                        <label for="password" class="block">Password</label>
                        <Password id="password" v-model="password" :class="{'p-invalid': passwordError}" inputClass="w-full" :feedback="false" />
                        <small v-if="passwordError" class="p-error block">{{ passwordError }}</small>
                    </div>
                    <Button type="submit" label="Login" class="mt-4 w-full" :loading="authStatus.loading" />
                </form>
            </template>
        </Card>
    </div>
    <Message v-if="loginError" severity="error" :text="loginError" class="mt-4" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUser } from '@/composables/auth/useUser'
import { useRouter } from 'vue-router';
import { useRssOAuth } from '@/composables/auth/rss-oauth/useRssOAuth'
import { computed } from 'vue';
import Card from 'primevue/card';
import InputText  from 'primevue/inputtext';
import  Password  from 'primevue/password';
import  Button  from 'primevue/button';
import  Message  from 'primevue/message';



const validateEmail = (email: string) => {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\].,;:\s@\"]{2,})$/i
        );
};

const email = ref<string>('')
const password = ref<string>('')

const emailError = computed(() => {
    if (email.value && !validateEmail(email.value)) {
        return 'Not a valid email address';
    }
    return '';
});

const passwordError = computed(() => {
    if (password.value && password.value.length < 8) {
        return 'Password needs to be a minimum of 8 characters';
    }
    return '';
});

const { authStatus } = useUser()

const { login, loginError } = useRssOAuth()

const router = useRouter()

async function submit() {
    if (!emailError.value && !passwordError.value) {
        const success = await login(email.value, password.value)
        if (success) {
            router.push('/')
        }
    }
}

</script>

<style lang="scss"></style>

