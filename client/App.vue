<template>
    Cards
</template>

<script>
    (async () => {
        const login = await fetch('/auth?username=xxxForm');

        let socket = new WebSocket("ws://localhost:5000");

        await new Promise(res => {
            socket.onopen = event => {
                console.log(event);
                res();
            }
        });

        socket.onmessage = event => {
            console.log(event)
        }

        socket.send(JSON.stringify({event: 'auth', username: 'xxxForm'}));

        
        socket.onclose = event => {
            console.log(event)
        }
    })();
</script>

<style>
</style>