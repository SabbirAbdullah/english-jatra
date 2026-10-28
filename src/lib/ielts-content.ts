/** Original practice content written for this project. Not taken from any IELTS test or published material. */

export const SPEAKING = {
  part1: [
    { topic: "Hometown", questions: ["Where is your hometown?", "What do you like most about living there?", "Has your hometown changed much in recent years?", "Would you like to live there in the future? Why or why not?"] },
    { topic: "Work or study", questions: ["Do you work or are you a student?", "What do you enjoy most about it?", "Is there anything you would like to change about your routine?", "What would be your ideal job?"] },
    { topic: "Food", questions: ["What kind of food do you enjoy eating?", "Do you prefer eating at home or at restaurants?", "Is there a dish from your country that visitors should try?", "Have your eating habits changed since you were a child?"] },
    { topic: "Technology", questions: ["How often do you use a smartphone?", "What apps do you find most useful?", "Do you think people spend too much time on their phones?", "How do you usually learn to use a new device?"] },
  ],
  part2: [
    { prompt: "Describe a teacher who helped you learn something important.", points: ["who the teacher was", "what they taught you", "how they helped you", "and explain why this person was important to you"] },
    { prompt: "Describe a place where you like to relax.", points: ["where it is", "how often you go there", "what you do there", "and explain why it helps you relax"] },
    { prompt: "Describe a time when you had to learn something quickly.", points: ["what you had to learn", "why you had to learn it quickly", "how you did it", "and explain how you felt about the experience"] },
  ],
  part3: [
    { topic: "Education", questions: ["What qualities make someone a good teacher?", "Do you think online classes can be as effective as classroom lessons?", "How might education change over the next twenty years?"] },
    { topic: "Free time", questions: ["Why do some people find it difficult to relax?", "Should employers encourage workers to take more holidays?", "How have leisure activities changed compared with a generation ago?"] },
  ],
};

export const WRITING = {
  task1: [
    { id: "t1a", min: 150, prompt: "The table shows how many people (in thousands) used four types of transport to travel to work in one city in 2000 and in 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
      table: { head: ["Transport", "2000", "2020"], rows: [["Car", "120", "150"], ["Bus", "80", "60"], ["Bicycle", "10", "45"], ["Train", "40", "55"]] } },
    { id: "t1b", min: 150, prompt: "The table shows the average number of hours per week that people in three age groups spent on three free-time activities. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
      table: { head: ["Age group", "Reading", "Sport", "Online video"], rows: [["16–24", "3", "5", "12"], ["25–44", "4", "3", "8"], ["45+", "7", "2", "5"]] } },
  ],
  task2: [
    { id: "t2a", min: 250, prompt: "Some people think children should start learning English at a very early age. Others believe it is better to start later. Discuss both views and give your own opinion." },
    { id: "t2b", min: 250, prompt: "More and more people now work from home. Do the advantages of this trend outweigh the disadvantages?" },
    { id: "t2c", min: 250, prompt: "Some people say governments should spend money on public transport rather than building new roads. To what extent do you agree or disagree?" },
  ],
  note: "Task 1 data above is fictional and for practice only.",
};

export const READING = {
  title: "The Marlow Bay Tidal Library",
  passage: [
    "When the town of Marlow Bay lost its last bookshop in 2015, residents feared that reading had no future there. Instead, a retired engineer named Dara Quill proposed an unusual idea: a small library built on stilts at the edge of the harbour, where books could be borrowed without any cards or fees. Volunteers raised the money in eighteen months, mostly through bake sales and a local concert.",
    "The building opened in 2019. Its design reflects the harbour's tides. At high water, the lower floor is closed and visitors use the upper reading room; at low water, a boardwalk opens and children can walk straight to the story corner. Solar panels on the roof supply most of the electricity.",
    "Critics initially argued that the library would attract few visitors because it is far from the town centre. However, figures collected by the volunteers show that more than 400 people now visit each week, which is about double the number the planners expected. The library also runs a weekend programme in which older residents read aloud to young children. Dara Quill has said she does not plan to expand the building, because she believes its small size is what makes it feel welcoming.",
  ],
  note: "This passage is fictional and written for practice.",
  /** Questions as sent to the browser (no answers). */
  questions: [
    { id: "q1", kind: "mc", text: "Why did Dara Quill propose the library?", options: ["The town's last bookshop had closed.", "The harbour needed a new building.", "Volunteers wanted a concert venue.", "The council offered free land."] },
    { id: "q2", kind: "mc", text: "How was the library paid for?", options: ["A government grant", "Fundraising by volunteers", "Entry fees from visitors", "A bank loan"] },
    { id: "q3", kind: "mc", text: "What happens at low water?", options: ["The library closes.", "A boardwalk opens to the story corner.", "The solar panels switch off.", "The upper reading room is closed."] },
    { id: "q4", kind: "tfng", text: "The library charges a small membership fee." },
    { id: "q5", kind: "tfng", text: "More people visit each week than the planners predicted." },
    { id: "q6", kind: "tfng", text: "Dara Quill intends to build a second library in the town centre." },
    { id: "q7", kind: "short", text: "What supplies most of the library's electricity? (NO MORE THAN TWO WORDS)" },
    { id: "q8", kind: "short", text: "In which year did the library open?" },
  ],
};

/** Answer key. Imported only by server code. */
export const READING_KEY: Record<string, { answers: string[]; why: string }> = {
  q1: { answers: ["The town's last bookshop had closed."], why: "Paragraph 1: after the last bookshop closed, Dara Quill proposed the library." },
  q2: { answers: ["Fundraising by volunteers"], why: "Paragraph 1: volunteers raised the money through bake sales and a concert." },
  q3: { answers: ["A boardwalk opens to the story corner."], why: "Paragraph 2: at low water a boardwalk opens to the story corner." },
  q4: { answers: ["False"], why: "Paragraph 1 says books are borrowed without cards or fees." },
  q5: { answers: ["True"], why: "Paragraph 3: more than 400 weekly visitors, about double the expected number." },
  q6: { answers: ["Not Given"], why: "She does not plan to expand the building, but a second library is never mentioned." },
  q7: { answers: ["solar panels", "solar power", "solar"], why: "Paragraph 2: solar panels on the roof supply most of the electricity." },
  q8: { answers: ["2019"], why: "Paragraph 2: the building opened in 2019." },
};
