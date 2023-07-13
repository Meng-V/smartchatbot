// import * as dotenv from 'dotenv';
// dotenv.config();

// import weaviate, { WeaviateClient, ObjectsBatcher, ApiKey } from 'weaviate-ts-client';
// import fetch from 'node-fetch';

// const client: WeaviateClient = weaviate.client({
//     scheme: 'https',
//     host: process.env.CLUSTER_URL || '',
//     apiKey: new ApiKey(process.env.WEAVIATE_API_KEY || ''),
//     headers: { 'X-HuggingFace-Api-Key': process.env.HUGGINGFACE_API_KEY || '' },
// });
// // Define the schema
// let classObj = {
//     'class': 'Conversation',
//     'vectorizer': 'text2vec-huggingface',
//     'properties': [
//         {
//             'name': 'userInput',
//             'dataType': ['text'],
//         },
//         {
//             'name': 'agentResponse',
//             'dataType': ['text'],
//         },
//     ],
//     'moduleConfig': {
//         'text2vec-huggingface': {
//             'model': 'sentence-transformers/all-MiniLM-L6-v2',
//             'options': {
//                 'waitForModel': true
//             }
//         }
//     }
// }

// async function addSchema() {
//     const res = await client.schema.classCreator().withClass(classObj).do();
//     console.log(res);
// }



// export async function queryWeaviate(question: string) {
//     const query = {
//         "query": {
//             "path": [{
//                 "value": question,
//                 "searchLimit": 1
//             }],
//             "properties": ["question", "answer", "certainty"]
//         }
//     };

//     // Execute the query
//     const result = await client.graphql
//         .get()
//         .withClassName('Question')
//         .withFields('question answer certainty')
//         .withNearText({ concepts: ['library'] })
//         .withLimit(1)
//         .do();

//     const satisfactory = result.data[0]?.certainty > (process.env.THRESHOLD || 0.9);
//     const answer = satisfactory ? result.data[0].answer : '';

//     return { satisfactory, answer };
// }

// export async function saveToWeaviate(userInput: string, agentResponse: string) {
//     const result = await client.data
//         .creator()
//         .withClassName('Conversation')
//         .withProperties({
//             userInput: userInput,
//             agentResponse: agentResponse,
//         })
//         .do();

//     console.log(result);
// }
