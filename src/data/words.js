export const wordSets = {
  basic: [
    "the","be","to","of","and","a","in","that","have","it","for","not","on","with",
    "he","as","you","do","at","this","but","his","by","from","they","we","say","her",
    "she","or","an","will","my","one","all","would","there","their","what","so","up",
    "out","if","about","who","get","which","go","me","when","make","can","like","time",
    "no","just","him","know","take","people","into","year","your","good","some","could",
    "them","see","other","than","then","now","look","only","come","its","over","think",
    "also","back","after","use","two","how","our","work","first","well","way","even",
    "new","want","because","any","these","give","day","most","us","great","between",
    "need","large","often","hand","high","place","hold","turn","here","why","help","put",
    "different","away","again","off","home","read","seem","found","still","should",
    "learn","plant","food","sun","four","state","keep","eye","never","last","let",
    "thought","city","tree","farm","hard","start","might","story","saw","far","sea",
    "draw","left","late","run","while","press","close","night","real","life","few",
    "north","open","together","next","white","children","begin","got","walk","ease",
    "paper","group","always","music","those","both","mark","book","letter","until",
    "mile","river","car","feet","care","second","enough","plain","girl","young","ready",
    "above","ever","red","list","though","feel","talk","bird","soon","body","dog",
    "family","direct","pose","name","set","old","air","line","mother","answer",
    "world","every","near","add","own","below",
    "country","school","father"
  ],
  intermd: [
    "achieve","balance","capable","develop","elegant","feature","generate","horizon",
    "improve","journey","knowledge","language","measure","navigate","observe","perform",
    "question","require","solution","thought","understand","valuable","abstract","behavior",
    "complete","describe","exchange","function","gradient","hardware","integrate","judgment",
    "keyboard","learning","mountain","naturally","optimize","practice","quantity","research",
    "strategy","template","ultimate","variable","workshop","accelerate","boundary","calculate",
    "determine","establish","framework","highlight","identify","leverage","mechanism",
    "normalize","objective","principle","recognize","simulate","technical","universal",
    "visualize","challenge","component","efficient","flexible","guidance","implement",
    "maintain","necessary","operation","procedure","represent","structure","threshold",
    "validate","workflow","algorithm","bootstrap","configure","dedicated","eliminate",
    "formulate","hypothesis","interface","migration","namespace","partition","recursive",
    "scheduler","transform","prototype","architect","bandwidth","container","dashboard",
    "endpoint","fragment","generator","iteration","lifecycle","middleware","navigator",
    "observer","pipeline","renderer","singleton","topology","upstream","validator"
  ],
  hard: [
    "abbreviation","accomplishment","acknowledgment","administrator","approximately",
    "authentication","bibliography","breakthrough","characteristic","circumference",
    "classification","collaboration","communication","comprehensive","configuration",
    "consequently","consideration","constitutional","controversial","correspondent",
    "crystallization","demonstration","deterioration","differentiation","disappointment",
    "discrimination","documentation","electromagnetic","environmental","establishment",
    "exaggeration","experimentation","extraordinary","familiarization","functionality",
    "generalization","globalization","hallucination","hospitalization","identification",
    "implementation","inappropriately","inconsistency","initialization","instrumentation",
    "interconnection","interpretation","investigation","justification","knowledgeable",
    "liberalization","manifestation","microprocessor","misunderstanding","multiplication",
    "nationalization","normalization","organizational","overwhelming","parliamentary",
    "participation","perpendicular","personalization","philosophical","photosynthesis",
    "popularization","predetermined","prioritization","professionalism","qualification",
    "quantification","rationalization","recommendation","representation","responsibility",
    "revolutionize","simultaneously","sophisticated","specification","standardization",
    "straightforward","subconsciously","telecommunications","transformation","unemployment",
    "vulnerability","infrastructure","cryptocurrency"
  ]
}

export function generateWords(tier, count) {
  const pool = wordSets[tier] || wordSets.basic
  const result = []
  for (let i = 0; i < count; i++) {
    result.push(pool[Math.floor(Math.random() * pool.length)])
  }
  return result
}
