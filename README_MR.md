# KIE.ai → Claude Remote MCP Bridge (मराठी)

हा प्रकल्प Claude च्या **Custom Connector** साठी remote MCP server आहे. तो KIE.ai च्या Anthropic-compatible chat API मधील मॉडेल्सची live यादी देतो आणि निवडलेल्या model ID ला prompt पाठवू शकतो.

## महत्त्वाच्या मर्यादा
- हा Claude चा मुख्य model बदलत नाही; Claude ला `kie_list_models` आणि `kie_chat` ही MCP tools मिळतात.
- KIE.ai च्या सर्व image/video/audio models या connector मधून चालतीलच असे नाही. हा bridge फक्त `https://api.kie.ai/anthropic/v1/models` मध्ये दिसणाऱ्या chat models साठी आहे.
- मी तुमच्या खात्यातून server deploy करू शकत नाही. त्यासाठी तुमच्या hosting खात्यात तुम्हालाच deploy करावे लागेल.
- KIE API वापरल्यावर तुमचे KIE credits खर्च होऊ शकतात.

## सोपा deploy मार्ग (Render / Railway सारख्या Node hosting वर)
1. या ZIP मधील फाइल्स GitHub repository मध्ये upload करा.
2. Node.js 20+ service म्हणून deploy करा; build command `npm install`, start command `npm start`.
3. Hosting च्या Environment Variables मध्ये:
   - `KIE_API_KEY` = तुमची KIE.ai API key
   - `CONNECTOR_TOKEN` = लांब, random secret (किमान 32 random अक्षरे)
4. Deploy झाल्यावर hosting कडून HTTPS URL मिळेल, उदा. `https://your-service.example.com`.
5. Claude मधील Add custom connector मध्ये:
   - Name: `KIE AI Models`
   - MCP server URL: `https://YOUR-HOSTNAME/mcp`
6. Authentication / Request headers मध्ये fixed header जोडा:
   - Header name: `Authorization`
   - Value: `Bearer YOUR_CONNECTOR_TOKEN`
   `YOUR_CONNECTOR_TOKEN` ला hosting मध्ये ठेवलेल्या CONNECTOR_TOKEN च्या नेमक्या value ने बदला.
7. Connect झाल्यावर Claude chat मध्ये connector enable करा. आधी `kie_list_models` वापरून उपलब्ध model IDs तपासा; मग `kie_chat` वापरून model ID आणि prompt द्या.

## सुरक्षा
- KIE API key कधीही Claude connector header मध्ये किंवा GitHub code मध्ये ठेवू नका; ती hosting environment variable मध्येच ಇರावी.
- `CONNECTOR_TOKEN` कोणालाही शेअर करू नका. उघड झाल्यास लगेच बदलून redeploy करा.
- सार्वजनिक repository मध्ये `.env` फाइल upload करू नका.

## Local test
```bash
npm install
# .env.example मधील values वापरून environment variables सेट करा
npm start
```
