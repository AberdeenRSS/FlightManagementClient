<script setup lang="ts">
import { useUser } from '@/composables/auth/useUser';
import { useRouter } from 'vue-router';
import { ref } from 'vue';

const router = useRouter()

const loginState = ref<string>('default')

const { currentUser, logout } = useUser()

function login(){
    router.push('/login')
}

function onLogout(){
    logout()
}

function register(){
    router.push('/register')
}

</script>

<template>
    <v-progress-circular v-if="loginState !== 'default' && loginState !== 'failed'" indeterminate>
    </v-progress-circular>
    <div class="d-flex align-center" v-else>

        <template v-if="currentUser">
            <div>{{ currentUser.name }}</div>
            <v-btn @click="onLogout">Logout</v-btn>
        </template>
        <template v-else>
            <v-btn @click="login">Login</v-btn>
            <v-btn @click="register">Register</v-btn>
        </template>
    </div>
</template>