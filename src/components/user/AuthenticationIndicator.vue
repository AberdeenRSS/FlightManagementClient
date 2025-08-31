<script setup lang="ts">
import { useUser } from '@/composables/auth/useUser';
import { useRouter } from 'vue-router';
import { ref } from 'vue';

const router = useRouter()

const loginState = ref<string>('default')

const { currentUser, logout } = useUser()

function login() {
    router.push('/login')
}

function onLogout() {
    if (confirm('Are you sure you want to logout?')) {
        logout()
    }
}

function register() {
    router.push('/register')
}

</script>

<template>
    <v-progress-circular v-if="loginState !== 'default' && loginState !== 'failed'" indeterminate>
    </v-progress-circular>
    <div class="d-flex align-center" v-else>

        <template v-if="currentUser">
            <v-menu>
                <template v-slot:activator="{ props }">
                    <v-btn 
                        v-bind="props" 
                        variant="flat"
                        class="rounded"
                        color=""
                        block="false">
                        <v-icon>mdi-account</v-icon>
                    </v-btn>
                </template>
                
                <div class="bg-surface elevation-8 rounded pa-2">
                    <div class="text-body-2 pa-2 text-medium-emphasis">
                        {{ currentUser.name }}
                    </div>
                    <v-btn 
                        @click="onLogout" 
                        variant="text" 
                        size="small"
                        prepend-icon="mdi-logout"
                        class="text-body-2 w-100 justify-start"
                    >
                        Logout
                    </v-btn>
                </div>
            </v-menu>
        </template>
        <template v-else>
            <v-btn @click="login">Login</v-btn>
            <v-btn @click="register">Register</v-btn>
        </template>
    </div>
</template>