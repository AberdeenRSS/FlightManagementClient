<template>
    <div class="authentication-indicator">
        <Button 
            type="button" 
            outlined
            icon="pi pi-ellipsis-v" 
            @click="toggle" 
            aria-haspopup="true"
            aria-controls="overlay_menu"></Button>
        <Menu ref="menu" id="overlay_menu" :model="items" :popup="true"/>
    </div>
</template>

<script setup lang="ts">
import { useUser } from '@/composables/auth/useUser';
import { useRouter } from 'vue-router';
import { ref } from 'vue';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import { computed } from 'vue';


const menu = ref();
const router = useRouter();
const { currentUser, logout } = useUser();

function toggle(event:Event) {
    menu.value.toggle(event);
}


const loginState = ref<string>('default')

const items = computed(() => {
    if (loginState.value !== 'default' && loginState.value !== 'failed') {
        return [{
            label: 'Loading...',
            icon: 'pi pi-spin pi-spinner'
        }];
    } else if (currentUser.value) {
        return [
            {
                label: currentUser.value.name,
                items: [{
                    label: 'Logout',
                
                    command: () => {
                        onLogout();
                        menu.value.hide();
                    }
                }]
            }
        ];
    } else {
        return [
            {
                label: 'Login',
                icon: 'pi pi-sign-in',
                command: () => {
                    login();
                    menu.value.hide();
                }
            },
            {
                label: 'Register',
                icon: 'pi pi-user-plus',
                command: () => {
                    register();
                    menu.value.hide();
                }
            }
        ];
    }
});



function login() {
    router.push('/login')
    menu.value = false
}

function onLogout() {
    logout()
    menu.value = false
}

function register() {
    router.push('/register')
    menu.value = false
}
</script>