# Project 9: L'Oréal Routine Builder
L’Oréal is expanding what’s possible with AI, and now your chatbot is getting smarter. This week, you’ll upgrade it into a product-aware routine builder.

Users will be able to browse real L’Oréal brand products, select the ones they want, and generate a personalized routine using AI. They can also ask follow-up questions about their routine—just like chatting with a real advisor.

## Run the app

Serve this folder with a local web server, such as the VS Code Live Server extension. The app loads `products.json` with `fetch`, so opening `index.html` directly from Finder may prevent the product catalog from loading.

## Connect the routine advisor

Ask your class instructor for the Cloudflare Worker URL. Add that URL to the `WORKER_URL` value near the top of `script.js`. This copy does not include a deployed Worker URL. Never add an OpenAI API key to this project; the Worker must keep that key as a server-side secret and accept a JSON request containing a `messages` array.

The frontend reads the reply from `choices[0].message.content`. It can also display citations if the Worker returns URL citation annotations with the assistant message. Live web search is not enabled by this frontend alone; the Worker must call a web-search-enabled OpenAI endpoint and return its citations.