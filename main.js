const mqtt = require('mqtt')
const fs = require('fs')
const client = mqtt.connect('mqtt://127.0.0.1')
const TOPIC = 'channel1'

//Connect to broker and subscribe
client.on('connect',function(){
    client.subscribe(TOPIC)
})
 
function checkcmd(msg){
    if(msg.cmd == 'sync' && msg.source == null)     return 1
    else if(msg.cmd == 'status' && msg.objects[0].source == null && msg.source == null)   return 2
    else if(msg.cmd == 'set')   return 3
    else if(msg.objects[0].data[0].setupCode != null )   return 4
    else return -1
}


//Get message and handle
client.on('message',function(topic,payload){
try    
    {
        let msg = JSON.parse(payload)
        switch(checkcmd(msg)){
            case -1: 
            {
                break
            }
            case 1: 
            {
                console.log('Event: Sync message from Edge')

                //handle for sync message
                msg.source = fs.readFileSync('/sys/class/net/eth0/address', 'utf8').replace(/\n/g, '')
                let message = JSON.stringify(msg)
                console.log('Publish message to Homekit => '+ message)
                client.publish(TOPIC,message)

                break
            }
            case 2:
            {
                console.log('Event: Status message from Edge')

                //handle for status message
                

                break
            }
            case 3:
            {
                console.log('Event: Received Set message from Homekit')
                console.log(payload)
                break
            }
            case 4:
            {
                console.log('Event: Received statusCode message')
                let message = {"cmd": "get", "reqid": msg.objects[0].reqid, "objects": [{"type": "msg", "data": [{"type":"info", "content":msg.objects[0].data[0].setupCode}]}]}
                client.publish(TOPIC,JSON.stringify(message))
                break
            }
                
        }
    }
catch(error){
    console.log(error)
}
})