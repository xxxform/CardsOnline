<template>
    <div class="wrapper">
        <h1>Cписок комнат</h1>
        <div class="createRoomWrapper">
            <h2>Создать комнату</h2>
            <label>Пароль: <input v-model="password" type="text" placeholder="необязательно"></label>
            <button v-on:click="createRoom()">Создать</button>
        </div>
        <div v-for="(room, id) in rooms" :key="id" class="room" :class="{'red': room.started || room.capacity === 6}">
            <span>Комната игрока: {{ room.user }} </span> |
            <span>Свободных мест: {{ 6 - room.capacity }} </span> |
            <span>Пароль: {{ room.password ? 'есть': 'нет' }} </span> |
            <button @click="join(room)">Войти</button>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            rooms: {},
            room: null,
            password: ''
        }
    },
    props: {
        modelValue: { type: Object },
        socket: { type: WebSocket }
    },
    methods: {
        createRoom() {
            this.socket.send(JSON.stringify({event: 'createRoom', password: this.password}));
            return;
        },
        join(room) {
            const message = {event: 'join'};
            if (room.password) {
                let password = prompt('Введите пароль');
                Object.assign(message, {password});
            }
            this.socket.send(JSON.stringify(message));
        },
        handler(event) {
            const message = JSON.parse(event.data);

            if (message.event === 'createRoom') {
                this.rooms[message.data.id] = message.data;
            }
            else if (message.event === 'joinRoom') {
                this.$emit('update:modelValue', message.data); 
            }
            else if (message.event === 'error') {
                alert(message.data);
            }

            //this.$emit('update:modelValue', this.userName); 
        }
    },
    async mounted() {
        this.socket.addEventListener('message', this.handler);
        this.socket.send(JSON.stringify({event: 'roomList'}));
    },
    unmounted() {
        this.socket.removeEventListener('message', this.handler);
    }
}
</script>

<style scoped>
</style>