<template>
    <div class="gameWrapper">
        <button class="buttonLeave" @click="leaveGame">Выйти</button>
        <div class="circleOfPlayers">
            <span class="playerField" v-for="(user, i) in users" :style="{transform: `rotate(${360 / users.length * i }deg)`}" :class="{'me': user.name === username}">
                <p class="userName" :style="{transform: `rotate(${180}deg)`}">{{ user.name }}</p>
                <p class="cards">
                    <span v-for="(card, i) in user.cards">
                        <span class="card" :class="{'hidden': !card.suit}">
                            <template v-if="card.suit">
                                <span class="nameUp">{{ card.suit }} <br> {{ card.name }}</span>
                                <span class="nameDown">{{ card.name }} <br> {{ card.suit }}</span>
                            </template>
                        </span>
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
            users: [],
            deck: [],
            desk: [],
        }
    },
    props: {
        modelValue: {type: Number},
        username: {type: String},
        socket: {type: WebSocket}
    },
    methods: {
        leaveGame() {
            this.socket.send(JSON.stringify({event: 'leave'}));
            this.$emit('update:modelValue', null); 
        },
        handler(event) {
            const message = JSON.parse(event.data);

            //['♠', '♥', '♣', '♦']
            const cards = [
                {suit: '♥', name: '10'},
                {suit: '♦', name: 'Т'},
                {suit: '♠', name: 'В'}, {},
                {suit: '♣', name: '6'},
            ];

            const users = [
                {name: '1', cards},
                {name: '1'},
                {name: '1', cards}, 
                {name: '1'},
            ]

            if (message.event === 'addUser') {
                message.data.cards = cards;
                this.users.push(message.data);
                this.users.push(...users)
            }
            if (message.event === 'remUser') {
                this.users.splice(this.users.findIndex(user => user.name === message.data.name), 1);
            }
            if (message.event === 'addCard') {
                if (message.data.type) {}
            }
            if (message.event === 'remCard') {

            }
        }
    },
    mounted() {
        this.socket.addEventListener('message', this.handler);
    },
    unmounted() {
        this.socket.removeEventListener('message', this.handler);
    }
}
</script>

<style scoped>

    .playerField.me {
        z-index: 1;
    }
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
            @media (max-width: 800px) {
                transform-origin: center calc(100vh/3);
            } 
            @media (max-height: 800px) {
                transform-origin: center calc(100vh/3);
            } 

            .userName{
                text-align: center;
            }

            
        }
    }

    .cards {
        direction: rtl;
        > span {
            width: 10%;
            display: inline-block;

            .hidden {
                background-color: bisque;
            }
            > .card {
                position: absolute;
                aspect-ratio: 2/3;
                min-width: 50%;
                display: inline-block;
                border: 1px solid black;
                background-color: white;
                font-size: 2vw;

                .nameUp {
                    position: absolute;
                    top: .5vw;
                    left: .5vw;
                    text-align: center;
                }
                
                .nameDown {
                    transform: rotate(180deg);
                    position: absolute;
                    bottom: .5vw;
                    right: .5vw;
                    text-align: center;
                }
            }
        }
    }
    
    .buttonLeave {
        position: absolute;
        z-index: 1;
    }
</style>