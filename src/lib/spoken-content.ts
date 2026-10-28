export const PATTERNS = [
  { en: "I would like to + verb", bn: "ভদ্রভাবে কিছু চাওয়া বা ইচ্ছা প্রকাশ করতে ব্যবহার করা হয়।", ex: "I would like to book a table for two." },
  { en: "Could you please + verb?", bn: "বিনয়ের সঙ্গে অনুরোধ করতে ব্যবহার করা হয়।", ex: "Could you please repeat that?" },
  { en: "I'm thinking of + verb-ing", bn: "কিছু করার কথা ভাবছি, কিন্তু এখনও ঠিক করিনি — এটি বোঝায়।", ex: "I'm thinking of joining an English club." },
  { en: "It depends on + noun", bn: "কোনো কিছু অন্য কিছুর ওপর নির্ভর করে — এটি বোঝাতে।", ex: "It depends on the weather." },
  { en: "If I were you, I would + verb", bn: "কাউকে পরামর্শ দেওয়ার সময় ব্যবহার করা হয়।", ex: "If I were you, I would practise every day." },
  { en: "I'm used to + verb-ing", bn: "কোনো কিছুতে অভ্যস্ত — এটি বোঝায়। (“used to + verb” মানে অতীতের অভ্যাস, দুটি আলাদা।)", ex: "I'm used to waking up early." },
];

export const MISTAKES = [
  { wrong: "I am agree with you.", right: "I agree with you.", bn: "“agree” নিজেই একটি ক্রিয়া, তাই আগে “am” লাগে না।" },
  { wrong: "He don't know the answer.", right: "He doesn't know the answer.", bn: "He/She/It এর সঙ্গে “doesn't” ব্যবহার করতে হয়।" },
  { wrong: "I have 25 years old.", right: "I am 25 years old.", bn: "ইংরেজিতে বয়স বোঝাতে “am/is/are” ব্যবহার হয়, “have” নয়।" },
  { wrong: "She is more taller than me.", right: "She is taller than me.", bn: "“taller” এর সঙ্গে আলাদা করে “more” বসে না।" },
  { wrong: "Let's discuss about the plan.", right: "Let's discuss the plan.", bn: "“discuss” এর পরে “about” লাগে না।" },
  { wrong: "I am boring in this class.", right: "I am bored in this class.", bn: "অনুভূতি বোঝাতে -ed (bored); যা বিরক্তিকর তা বোঝাতে -ing (boring)।" },
  { wrong: "Please open the light.", right: "Please turn on the light.", bn: "আলো/পাখার ক্ষেত্রে “turn on/off” বলা হয়।" },
  { wrong: "I did not saw him.", right: "I did not see him.", bn: "“did not” এর পরে ক্রিয়ার মূল রূপ (base form) বসে।" },
];

export const TOPICS = [
  { topic: "Introducing yourself", qa: [["Could you tell me a little about yourself?", "Sure. I'm a student from Chattogram, and I'm studying computer science."], ["What do you do in your free time?", "I usually read, play football with friends, and practise English."], ["Why are you learning English?", "I'd like to study abroad and work with international teams."]] },
  { topic: "Shopping", qa: [["How much is this?", "It's 500 taka. Would you like to try it on?"], ["Do you have this in a larger size?", "Let me check. One moment, please."], ["Can I pay by card?", "Yes, we accept cards and mobile payments."]] },
  { topic: "Asking for directions", qa: [["Excuse me, how do I get to the railway station?", "Go straight, then turn left at the second traffic light."], ["Is it far from here?", "No, it's about a ten-minute walk."], ["Could you show me on the map?", "Of course. We are here, and the station is there."]] },
  { topic: "At a restaurant", qa: [["Are you ready to order?", "Yes, I'll have the chicken curry and a glass of water, please."], ["Would you like anything else?", "No, thank you. Could we have the bill, please?"], ["Is this dish spicy?", "It's medium. I can ask the kitchen to make it milder."]] },
];

export const DIALOGUES = [
  { title: "Making an appointment", lines: [["Receptionist", "Good morning. How can I help you?"], ["You", "Hello. I'd like to make an appointment for Tuesday, please."], ["Receptionist", "Certainly. Would ten o'clock suit you?"], ["You", "Ten is fine. Thank you."]] },
  { title: "Asking a colleague for help", lines: [["You", "Excuse me, do you have a minute?"], ["Colleague", "Sure. What's up?"], ["You", "I'm having trouble with this report. Could you take a look?"], ["Colleague", "Of course. Let's go through it together."]] },
  { title: "Meeting someone new", lines: [["A", "Hi, I'm Rina. Nice to meet you."], ["B", "Nice to meet you too. I'm Sam. Have you been here long?"], ["A", "Only a few weeks. How about you?"], ["B", "About a year. I can show you around if you like."]] },
];
