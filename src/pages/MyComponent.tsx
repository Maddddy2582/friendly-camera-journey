import { useMicVAD } from "@ricky0123/vad-react"

const MyComponent = () => {
   const socket = new WebSocket("ws://localhost:8000/ws");
const vad = useMicVAD({
    onSpeechEnd: (audio) => {
    console.log("User stopped talking")
    socket.send(JSON.stringify({ type: "audio", audio }))
    console.log(audio)
    },
})
return <div>{vad.userSpeaking && "User is speaking"}</div>
}

export default MyComponent