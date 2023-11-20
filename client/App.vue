<template>
    <modal-auth v-if="socket && !userName" :socket="socket" v-model="userName"/>
    <room-list v-if="userName && !room" :socket="socket" v-model="room"/>
    <game v-if="room" :socket="socket" :user="userName" v-model="room"/>
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
            let socket = new WebSocket("ws://192.168.0.172:5000");

            await new Promise(res => {
                socket.onopen = event => {
                    res();
                }
            });

            this.socket = socket;

            socket.onclose = event => {
                console.error(event)
            }
        },
        methods: {

        }
    }

    
</script>

<style>
</style>