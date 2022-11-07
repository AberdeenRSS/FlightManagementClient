<script setup lang="ts">
import { useAuthFlow, useUserData, login, logout } from '@/composables/msal/useMsal';

const { activeAccount } = useUserData()
const { loginState } = useAuthFlow()
</script>

<template>
    <v-progress-circular v-if="loginState !== 'default' && loginState !== 'failed'" indeterminate>
    </v-progress-circular>
    <div class="d-flex align-center" v-else>

        <template v-if="activeAccount">
            <div>{{ activeAccount.username }}</div>
            <v-btn @click="logout">Logout</v-btn>
        </template>
        <template v-else>
            <v-btn @click="login">Login</v-btn>
        </template>
    </div>

</template>