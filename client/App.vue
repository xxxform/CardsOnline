<template>
    <modal-auth v-if="socket && !userName" :socket="socket" v-model="userName"/>
    <room-list v-if="userName && !room" :socket="socket" v-model="room"/>
    <game v-if="room" :socket="socket" :username="userName" v-model="room"/>
</template>

<script>
    import modalAuth from './modalAuth.vue';
    import roomList from './roomList.vue';
    import game from './game.vue';

    export default {
        components: {
            modalAuth, roomList, game
        },
        data() {
            return {
                userName: '',
                socket: null,
                room: null
            }
        },
        async mounted() {
            const urlParams = new URLSearchParams(window.location.search);
			const address = urlParams.get('serverip') || window.location.hostname;

            let socket = new WebSocket(`ws://${address}:5000`);
            try {
                socket.onclose = event => {
                    console.log('Соединение закрыто');
                }

                await new Promise((resolve, reject) => {
                    socket.onopen = resolve;
                    socket.onerror = reject;
                });

                this.socket = socket;
            } catch(e) {
                alert(`Не удалось подключиться к серверу ${socket.url}`)
            }
        }
    }
</script>

<style scoped>
</style>