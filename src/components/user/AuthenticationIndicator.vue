<script setup lang="ts">
import { useAuthFlow, useUserData, login, logout } from '@/composables/msal/useMsal';

    const {activeAccount} = useUserData()
    const {loginState} = useAuthFlow()
</script>

<template>
    <b-spinner v-if="loginState !== 'default' && loginState !== 'failed'"></b-spinner>
    <span v-else>

        <span v-if="activeAccount">
            <p>{{activeAccount.username}}</p><b-button @click="logout">Logout</b-button>
        </span>
        <span v-else>
            <b-button @click="login">Login</b-button>
        </span>
    </span>

</template>