import random

python_list = [
    "Naan oru thadava sonna, nooru thadava sonna madhiri. - When I say something once, it's like I said it a hundred times. - Use this when someone keeps repeating a point over and over.",
    "Enna koduma Sir idhu? - What a punishment, Sir! - Use when something is too difficult or frustrating to handle.",
    "Macha, ithu oru padam da. - Dude, this is a movie. - Use to express surprise or exaggerate a situation.",
    "Vera level tension iruku! - There’s next-level tension! - Use when the situation feels extremely intense or dramatic.",
    "Adha naan kaekka mudiuma? - Can I even ask for that? - Use when something seems impossible or highly unlikely.",
    "Naan oru periya laddu, kannai thirandha udhane kooda thitturaen. - I’m like a big sweet, I can still be slapped if my eyes are open. - Use humorously when facing an embarrassing situation.",
    "Saami, kaadhalan, kaadhalan, kaadhalan! - God, love, love, love! - Use when someone is in a passionate, dreamy mood.",
    "Aasai vandha, adutha thadava vaazhdhalum azhagiya thudhi. - When desire comes, the next time, life will also become beautiful. - Use when someone is optimistic despite challenges.",
    "Unmai paakara maadhiri irundhaal, onnu thirundhaal. - Look like you’re seeing the truth, but the moment you turn, it’s all a lie. - Use when someone is faking a reaction.",
    "Appo, antha avastha ungalukku theriyum, oru shot adhigama podanum. - That situation is clear to you, just take the extra shot. - Use in a context where a little more effort can change everything.",
    "Vandha kozhandha naan thirundhaal, adutha kozhandha thirundhaal. - When the baby arrives, I’ll change, next time I’ll change. - Use when someone keeps promising change but doesn't act.",
    "Ullam kaayam thaana? - Is the heart a furnace? - Use when someone is extremely cold-hearted or heartless.",
    "Aaha, ithu naalum poyidum, aadhavida ithu, ippadi pogum! - Aha, this too will pass, but this, this will happen like this! - Use when discussing something that will happen as expected.",
    "Aasai kaattiya ponnu, aasai kaattiya kozhundhu! - The girl showing desire, the baby showing desire! - Use when discussing someone who is openly showing interest in something.",
    "Thappu solli thirundhaal, azhagiya pudhu vaarththai! - If you say something wrong and turn, it's beautiful new words. - Use when correcting someone's mistake with flair.",
    "Sir, adutha vaarthai padikka vendaam, innum oru naal paathu padikkanum. - Sir, don’t learn the next word, wait one more day to learn. - Use when someone’s eagerness is out of place.",
    "Kaadhalai kaanbadhal thavira, innum oru koodi irundhaal saami! - Seeing love, not just the rest, there should be another group, God! - Use when exaggerating a romantic scenario.",
    "Kundakkaaraya oru rasam thaana? - Is a rasam the reason for a mess? - Use when someone is blamed unfairly for something trivial.",
    "Ithu naama kaaththukittu irundhaal kaaththuraai, kaanada achchan enge? - If we wait, will the hands fight, where is the camera? - Use humorously when confused about a situation.",
    "Pudhu puthu kadhai, idhanal enga azhagiya padam? - A new story, how did it make a beautiful movie? - Use when something ordinary becomes extraordinary.",
    "Unmai sonna rendu thadavai parka mudiyuma? - If the truth is said, can we see it twice? - Use when someone asks a question that seems almost impossible to answer.",
    "Ithu vaazhdhal vaazhdhalum tholvi theriyaadhu. - What is this, it’s life, but there’s no way to escape. - Use when something is too overwhelming to avoid.",
    "Oru naal aaraindhaal, oru naal soththudhaan! - One day you tie it, another day you loosen it. - Use when someone can’t make up their mind or is inconsistent.",
    "Naan pannu, avan paadum, oru rooba illa. - If I do it, he sings, but there’s not even one rupee. - Use humorously when someone does something without getting any reward.",
    "Sutrivarum saami, thudhi thudhi! - Walking around, God, clap clap! - Use when someone is showboating or acting overly dramatic.",
    "Ingu vaarththai, andha thirundhaal unmai puriyum. - Words here, truth is understood by turning. - Use when there’s a lot of mystery in a conversation.",
    "Thirundhaal thunaiyaga illai, thunaiyaga thirundhaal. - Turning may not help, but turning together will help. - Use when teamwork seems like the answer to a problem.",
    "Rendavida pongidum, aadhavida ithu pogum! - The second one will fly, but this will be the end! - Use when a solution seems simple and straightforward.",
    "Enna da ethana vaarthai solli, oru punch podraen? - What, how many words to say, should I just give a punch? - Use when you’re tired of talking and just want to act.",
    "Machi, ippadi thaan naan solriya, iththanaiyum udhavi thaana. - Dude, I said this way, this will be the help! - Use when you give advice that seems simple but impactful."
]

# Pick a random dialogue
random_dialogue = "\n".join(random.choices(python_list, k=5))
print(random_dialogue)
