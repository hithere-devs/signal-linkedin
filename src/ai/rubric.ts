export const TECH_TERMS = [
  'python','javascript','typescript','java','golang','rust','c++','c#','kotlin','swift','scala','ruby','php',
  'react','vue','angular','svelte','next.js','node','deno','django','flask','fastapi','spring','rails','.net',
  'sql','nosql','postgres','postgresql','mysql','mongodb','redis','elasticsearch','dynamodb','snowflake','bigquery',
  'aws','azure','gcp','vercel','cloudflare','kubernetes','docker','terraform','serverless','lambda','microservices',
  'kafka','rabbitmq','spark','hadoop','airflow','dbt','etl','graphql','grpc','rest','websocket',
  'llm','llms','gpt','openai','anthropic','claude','gemini','mistral','llama','transformer','transformers',
  'embedding','embeddings','rag','fine-tuning','finetuning','prompt','diffusion','stable diffusion','midjourney',
  'machine learning','deep learning','neural network','computer vision','nlp','reinforcement learning',
  'tensorflow','pytorch','keras','hugging face','langchain','vector database','pinecone','weaviate','faiss',
  'git','github','gitlab','ci/cd','jenkins','devops','sre','observability','monitoring','grafana','prometheus',
  'system design','distributed systems','load balancing','caching','sharding','replication','consistency',
  'api','sdk','framework','library','compiler','runtime','webassembly','wasm','blockchain','solidus',
  'figma','notion','linear','stripe','twilio','segment','amplitude','mixpanel'
];

export const ARCH_TERMS = [
  'architecture','scalability','scaling','latency','throughput','availability','fault tolerance','idempotent',
  'queue','pipeline','infrastructure','deployment','rollback','canary','blue-green','autoscaling','cdn',
  'inference cost','model training','training loop','gpu','tokens per second','context window'
];

export const DATA_WORDS = /\b(chart|graph|table|benchmark|benchmarks|study|studies|survey|research|dataset|data set|report|findings|analysis|analyzed|teardown|experiment|experiments|a\/b test|ab test|split test)\b/i;
export const DATA_SOURCES = /\b(arxiv|doi\.org|nature\.com|gartner|mckinsey|statista|levels\.fyi|github\.com\/[\w-]+\/[\w-]+)\b/i;
export const EVIDENCE_NUMBERS = /(?:^|\s)[-+]?\$?€?₹?\d[\d,.]*\s*(?:%|x\b|percent)/gi;
export const CURRENCY = /[$€₹£]\s?\d/;
export const ANY_NUMBER = /(?:^|[\s(])[-+]?\$?\d[\d,.]*(?:\s*(?:%|x|k|m|bn|billion|million|thousand|users|customers|requests|prs|commits|repos|candidates|interviews|hires|signups|conversions|churn|arr|mrr|downloads|installs))?/gi;

export const PATTERNS = {
  howTo: /\b(how (we|i) |step[- ]by[- ]step|here'?s (how|what)|here is how|these were the|tutorial|guide|walkthrough|deep dive|breakdown|explained|playbook|checklist|template|steps (we|i|to))\b/i,
  interview: /\b(interview(ed)? (for|at|with)|interview questions|asked (me|these|this)|my interview|the interview|screening call|hiring process|recruiter (call|reached)|take[- ]home)\b/i,
  bait: /\b(agree\??\s*$|thoughts\?\s*$|comment (below|"yes")|like if|repost if|follow (me|for more)|dm me|who else|tag someone|drop a|say it louder|am i wrong)\b/i,
  motivation: /\b(never give up|believe in yourself|keep pushing|hustle|grind|mindset is everything|dream big|consistency is key|hard work pays|trust the process|your only limit|success doesn'?t come|motivation|inspire[ds]?|game ?changer|unlock your)\b/i,
  sob: /\b(sleepless nights|rejections?|rejected \d+ times|struggled|struggling|rock bottom|almost gave up|cried|tears|homeless|couldn'?t afford|no money|debt|barely ate|doubt(ed)? myself|imposter syndrome)\b/i,
  selfieContext: /\b(selfie|office (photo|pics?|vibes)|photoshoot|new haircut|gym mirror|mirror selfie|outfit of the day|ootd|golden hour|aesthetic)\b/i,
  promo: /\b(sign up|register now|free trial|limited (time|seats|spots)|discount|promo code|enroll(ment)? (is )?(open|now)|early bird|waitlist is open|i built|we built|we launched|just launched|now live|introducing|check out our|try .*free|link in comments?|link in bio|book a demo|get started today)\b/i,
  genericLists: /\b\d+\s+(lessons|tips|things|habits|rules|truths|secrets|qualities|skills) (i|you|we|every|about)?/i,
  congrats: /\b(excited to (announce|share)|thrilled to|honored|humbled|happy to share|pleased to announce|new role|started a new position|promoted|i'?m (now|officially))\b/i,
  jobPost: /\b(we'?re hiring|is hiring|hiring for|open (role|position)|new (role|opening)|apply now|job alert|join (my|our) team|looking for (a|an) .{0,30}(engineer|developer|designer|manager|intern|marketer|sales))\b/i,
  salary: /\b(salary|compensation|total comp|negotiat|offer (level|letter)|base salary|equity|rsu|levels\.fyi)\b/i,
  originalEvidence: /\b(we ran|i ran|our (experiment|tests?|data|analysis|study)|we analyzed|i analyzed|results of|case study|across \d+[\d,.]*|sample (size|of)|we benchmarked|we measured|we tested)\b/i,
  resources: /\b(repositories?|repos?\b|open[- ]source|libraries?|tools?|frameworks?|resources|course|cheatsheet|cheat sheet|newsletter|podcast episode|paper|dataset|data set|methodology)\b/i,
  questionOnlyEnd: /[?]\s*$/,
  emotionWords: /\b(blessed|grateful|thankful|journey|humbling|surreal|dream come true|pinch me|emotional|proud moment)\b/gi
};

export const CLASSIFICATION_LABELS = {
  ad: 'ad',
  job: 'job',
  interviewPrep: 'interview-prep',
  technical: 'technical',
  ai: 'ai',
  startup: 'startup',
  research: 'research',
  data: 'data-insight',
  careerMilestone: 'career-milestone',
  careerAdvice: 'career-advice',
  motivation: 'motivation',
  engagementBait: 'engagement-bait',
  promotional: 'promotional',
  personal: 'personal',
  repost: 'repost',
  poll: 'poll',
  empty: 'empty'
} as const;
