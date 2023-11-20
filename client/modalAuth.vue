<template>
    <div class="wrapper">
        <div class="content">
            <h1>Введите своё имя</h1>
            <input type="text" v-model="userName" placeholder="Введите имя"><br>
            <button @click="auth(userName)">Войти</button>
            <p class="info">{{info}}</p>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            userName: '',
            info: ''
        };
    },
    props: {
        modelValue: {type: String},
        socket: {type: WebSocket}
    },
    methods: {
        handler(event)  {
            const message = JSON.parse(event.data);

            if (message.event === 'auth' && message.data === 'ok') {
                this.$emit('update:modelValue', this.userName); 
                localStorage.setItem('username', this.userName);
                
            } else if (message.event === 'error') {
                this.info === message.data;
            }
        },
        auth(username) {
            if (!username) return;
            this.socket.send(JSON.stringify({event: 'auth', username}));
        }
    },
    async mounted() {
        this.socket.addEventListener('message', this.handler);
        const storageUserName = localStorage.getItem('username');
        if (storageUserName) this.auth(this.userName = storageUserName);
    },
    unmounted() {
        this.socket.removeEventListener('message', this.handler);
    }
}
</script>

<style scoped>
    .wrapper {
        position: absolute;
        top: 0;
        bottom: 0;
        right: 0;
        left: 0;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .content {
        width: 50vw;
        height: 50vh;
    }
    h1 {
        text-align: center;
    }
    input, button {
        width: 100%
    }
    button {
        margin-top: 1em
    }
    .info {
        color: red;
    }
</style>