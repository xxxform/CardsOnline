<template>
    <div class="gameWrapper">
        <button class="buttonLeave" @click="leaveGame">Выйти</button>
        <div class="circleOfPlayers">
            <span class="playerField" v-for="(user, i) in users" :style="{transform: `rotate(${360 / users.length * i }deg)`}" :class="{'me': user.name === user}">
                <p class="userName" :style="{transform: `rotate(${180}deg)`}">{{ user.name }}</p>
                <p class="cards">
                    <span v-for="(card, i) in user.cards">
                        <span class="card"></span>
                    </span>
                </p>
            </span>
        </div>
    </div>
</template>

<script>
//todo сделать при ховере z-index или при нажатии / touchmove чтобы можно было кидать карту
export default {
    data() {
        return {
            users: []
        }
    },
    props: {
        modelValue: {type: Number},
        user: {type: String},
        socket: {type: WebSocket}
    },
    methods: {
        leaveGame() {
            this.$emit('update:modelValue', null); 
        },
        handler(event) {
            const message = JSON.parse(event.data);
            const cards = [
                {},
                {},
                {}, {}, {}, {}, {}, {}, {}, {}
            ];

            if (message.event === 'addUser') {
                this.users.push(message.data);
                this.users.push(...[
                {name: '1', cards},
                {name: '1'},
                {name: '1'}, 
                {name: '1', cards}, 
                {name: '1'},
                ])
            }
        }
    },
    mounted() {
        this.socket.addEventListener('message', this.handler);
    },
    unmounted() {
        this.socket.send(JSON.stringify({event: 'leave'}));
        this.socket.removeEventListener('message', this.handler);
    }
}
</script>

<style scoped>
    .circleOfPlayers {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        /* align-items: center; */
        /* text-align: center; */
        transform: rotate(180deg);

        .playerField {
            position: fixed;
            width: 30vw;
            height: 23vh;
            background-color: grey;
            display: inline-block;
            transform-origin: center calc(100vh/2);
            white-space: nowrap;

            @media (max-width: 800px) {
                transform-origin: center calc(100vh/3);
            } 

            .userName{
                text-align: center;
            }

            .cards {
                direction: rtl;
                > span {
                    width: 10%;
                    display: inline-block;
                    > span {
                        position: absolute;
                        aspect-ratio: 2/3;
                        min-width: 50%;
                        display: inline-block;
                        /* width: 30px;
                        height: 50px; */
                        border: 1px solid black;
                        background-color: white;
                    }
                }
            }
        }
    }
    
    .buttonLeave {
        position: absolute;
    }
</style>