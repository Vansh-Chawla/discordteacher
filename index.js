//Credentials and personal info
const token = "bot token here";

//libraries
const Discord = require('discord.js');
const fs = require('fs');
const path = require('path')

//basic bot info (constant)
const prefix = "!ca "
const prefixNoSpace = "!ca"

//bot initialization
const bot = new Discord.Client();
bot.login(token);

//useful stufs
var guildsClasses = {}
var ongoingClasses = []

//Ready event
bot.on('ready', ()=> {
    LoadClasses()
    console.log("The bot was turned on.");
    
})


//Message event
bot.on('message', message=>{
    var ping = false;
    let args;
    var content = message.content.toLowerCase();
    if (message.mentions.users.has("789562961118494752")){
        ping = true;
        args = content.split(" ").slice(1);
    }
    else{
        if (content.startsWith(prefixNoSpace) && !content.startsWith(prefix)){
            message.channel.send("❌ Please enter a valid command. Type !ca help for help.");
            return;
        }
        if (!content.startsWith(prefix)){
            return;
        }
        args = content.substring(prefix.length).split(" ")
    }
    switch(args[0]){
        case 'ping':
            message.reply('Pong!');
            break
        case 'help':
            message.channel.send(helpPage)
            break
        case 'muteall':
            if (!message.member.hasPermission("MANAGE_GUILD") && !message.member.roles.cache.find(r => r.name === "Teacher")){
                message.reply("You need to have Manage Servers permission or a role named 'Teacher' to be able to mute everyone.");
                return;
            }
            if (!message.member.voice.channelID){
                message.reply("You need to be in a voice channel to use this command!");
                return
            }
            var vcmembers = message.member.voice.channel.members;
            vcmembers.forEach(member=>{
                if (member !== message.member){
                    member.voice.setMute(true);
                }
            })
            break
        case 'unmuteall':
            if (!message.member.hasPermission("MANAGE_GUILD") && !message.member.roles.cache.find(r => r.name === "Teacher")){
                message.reply("You need to have Manage Servers permission or a role named 'Teacher' to be able to unmute everyone.");
                return;
            }
            if (!message.member.voice.channelID){
                message.reply("You need to be in a voice channel to use this command!");
                return
            }
            var vcmembers = message.member.voice.channel.members;
            vcmembers.forEach(member=>{
                if (member !== message.member){
                    member.voice.setMute(false);
                }
            })
            break
        case 'random':
            if (!message.member.voice.channelID){
                message.reply("You need to be in a voice channel to use this command!");
                return
            }
            var vcmembers = message.member.voice.channel.members;
            var arrayMembers = []
            vcmembers.forEach(member=>{
                arrayMembers.push(member.displayName)
            })
            var randomMember = arrayMembers[Math.floor(Math.random() * arrayMembers.length)];
            message.reply("Drumroll please... The random person is-: " + randomMember)
            break
        case 'class':
            switch(args[1]){
                case 'create':
                    //Class create event will have-: subject name (2), student role(3), voice channel name(4).
                    if (!message.member.hasPermission("MANAGE_GUILD") && !message.member.roles.cache.find(r => r.name === "Teacher")){
                        message.reply("You need to have Manage Servers permission or a role named 'Teacher' to be able to create a class.");
                        return;
                    }
                    if (args[2] === undefined || args[3] === undefined || args[4] === undefined){
                        message.reply("❌ The syntax for the class creation is-: class create {subject name} {student role mention} {Voice channel name}");
                        return;
                    }
                    if (!message.mentions.roles.first()){message.reply("❌ Please mention a valid student role to create the class."); return;}
                    var studentRole = message.mentions.roles.first().id;
                    var vc = message.guild.channels.cache.find(channel => channel.name === args[4])
                    if (!vc) {message.reply("❌ Please enter a name of a valid channel in the server."); return;}
                    if (vc.type !== "voice"){message.reply("❌ Please enter the name of a voice channel, not a text channel."); return}
                    var classClass = new Classroom(args[2], message.author.id, studentRole, vc.id, message.guild.id)
                    classClass.UpdateToFile();
                    guildsClasses[message.guild.id].push(classClass);
                    message.reply("✅ Successfully created a new class.")
                    break
                default:
                    if (!args[1]){
                        message.reply("❌ Please enter the name of the class you would like to read/modify. If you would like to create a class, use !ca class create, for help"+
                        " use !ca class help.")
                        return;
                    }
                    var foundClass = null
                    var classesInGuild = guildsClasses[message.guild.id];
                    classesInGuild.forEach(classroomClass=>{
                        if (classroomClass.subjectName === args[1]){
                            foundClass = classroomClass
                        }
                    })
                    if (foundClass === null){
                        message.reply("❌ Please enter a valid name of a class.");
                        return
                    }
                    if (message.author.id != foundClass.teacherId){
                        message.reply("❌ You need to be a teacher of that class to be able to use commands for that class!")
                        return
                    }
                    switch(args[2]){
                       
                        case 'start':
                            var nicks = []
                            message.guild.members.cache.forEach(member=>{
                                if (member.roles.cache.has(foundClass.studentRoleId)){
                                    nicks.push(member)
                                }
                            })
                            var attendenceObjs = []
                            nicks.forEach(nick=>{
                                attendenceObjs.push(new Attendence(nick.displayName))
                            })
                            ongoingClasses.push({"class":foundClass, "attendence":attendenceObjs})
                            break
                        case 'stop':
                            ongoingClasses.forEach(dictionary=>{
                                var ongoingClass = dictionary["class"]
                                var attendence = dictionary["attendence"]
                                if (ongoingClass.subjectName == foundClass.subjectName){
                                    const index = ongoingClasses.indexOf(dictionary);
                                    if (index > -1) {
                                        ongoingClasses.splice(index, 1);
                                    }
                                    presentableAttendence = `**Attendence for class at ${attendence.classStartTime}\n**`
                                    attendence.forEach(studentAttendence=>{
                                        presentableAttendence += studentAttendence.GetAttendence();
                                        presentableAttendence += "\n"
                                    })
                                    var user = message.guild.members.cache.get(ongoingClass.teacherId);
                                    user.send(presentableAttendence)
                                }
                            })
                            break
                        case 'addresource':
                            if(!args[3]){message.reply("Please mention a link to send your students as a resource!"); return}
                            message.guild.members.cache.forEach(member=>{
                                if (member.roles.cache.has(foundClass.studentRoleId)){
                                    member.user.send(`**Your ${foundClass.subjectName} teacher added a new resource for you to refer to!-:**\n${args[3]}`)
                                }
                            })
                            break
                            

                    }
                    
            }
            break
        default:
            if (!ping){
                message.channel.send("❌ Please enter a valid command. Type !ca help for help.");
                return;
            }
            message.channel.send(helpPage)
    }
})


bot.on('voiceStateUpdate', (oldMember, newMember)=>{
    if (!oldMember.channelID && newMember.channelID){
        var id = newMember.channelID
        var classObj = null;
        ongoingClasses.forEach(dictionary=>{
            if (dictionary["class"].voiceChannel == id){
                classObj = dictionary
            }
        })
        if (classObj === null){return;}
        var attendence = classObj["attendence"];
        attendence.forEach(studentAttendence=>{
            if (studentAttendence.studentNickname === newMember.member.displayName){
                studentAttendence.EnteredClass()
            }
        })
    }
})
//Classes
class Classroom {
    constructor(subjectName, teacherId, studentRoleId, voiceChannel, guildId){
        this.subjectName = subjectName;
        this.teacherId = teacherId;
        this.studentRoleId = studentRoleId;
        this.voiceChannel = voiceChannel;
        this.guildId = guildId
    }

    UpdateToFile() {
        var guildsPath = path.join("data", "guilds")
        var jsonString = JSON.stringify(this);
        var gid = String(this.guildId)
        if (!fs.existsSync(path.join(guildsPath, gid))){
            fs.mkdirSync(path.join(guildsPath, gid))}
        var filePath = path.join("data", "guilds", gid, this.subjectName + ".json")
        fs.writeFile(filePath, jsonString, (err)=>{
            if (err){console.log(err)}
        })
    }

    static from(json){
        return Object.assign(new Classroom(json.subjectName, json.teacherId, json.studentRoleId, json.voiceChannel, json.guildId), json)
    }
}

class Attendence{
    constructor(studentNickname, lateMinutes=5){
        this.studentNickname = studentNickname;
        this.classStartTime = new Date()
        this.lateMinutes = lateMinutes
    }
    EnteredClass() {
        this.timeEntered = new Date()
    }
    GetAttendence() {
        var time = "Absent"
        var status = "🔴"
        if (this.timeEntered !== undefined){
            var hours = ("0" + this.timeEntered.getHours()).slice(-2);
            var minutes = ("0" + this.timeEntered.getMinutes()).slice(-2);
            time = `Entered at ${hours}:${minutes}`
            if (Math.round((this.timeEntered-this.classStartTime)/60000)>this.lateMinutes){
                status = "🟠"
            }
            else{status="🟢"}
        }
        
        return `${status}${this.studentNickname}: ${time}`
    }
}

function getDirectories(path) {
    return fs.readdirSync(path).filter(function (file) {
      return fs.statSync(path+'/'+file).isDirectory();
    });
  }


function LoadClasses(){
    const dir = path.join("data", "guilds")
    var guildDirs = getDirectories(dir);
    guildDirs.forEach(guildId => {
        var files = fs.readdirSync(path.join(dir, guildId));
        var listOfClasses = []
        files.forEach(file=>{
            var data = fs.readFileSync(path.join(dir, guildId, file), 'utf8');
            var object = JSON.parse(data);
            listOfClasses.push(Classroom.from(object))
           
        })
        guildsClasses[guildId] = listOfClasses
    });
}






const helpPage = `

These are the commands of the bot-:
!ca help-: Shows this page
!ca ping-: Check if the bot is online and working
!ca muteall-: Command for the teacher to mute everyone in the voice channel
!ca unmuteall-: Command for the teacher to unmute everyone in the voice channel
!ca random-: Pick a random person on the voice call!
!ca class create {subject name} {student role mention} {Voice channel name}-: Creates a new class.
!ca class {subject name} start-: Starts the class with that subject name on that guild, and records student attendence.
!ca class {subject name} stop-: Stops the class and DMs you the attendence. 
!ca class {subject name} addresource-: DMs all the student with a resource link.
`