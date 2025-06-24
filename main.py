from fastapi import FastAPI, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from azure.ai.inference import ChatCompletionsClient
from azure.core.credentials import AzureKeyCredential
from tenacity import retry, wait_random_exponential, stop_after_attempt
from pydantic import BaseModel
import logging
import os
import json
from dotenv import load_dotenv
from typing import Dict, Any, Optional
import asyncio

# Load environment variables
load_dotenv('.env')

# Initialize FastAPI app
app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="templates")
templates.env.globals['static_url'] = lambda path: f"/static/{path}"

# Initialize Azure AI client
azure_client = ChatCompletionsClient(
    endpoint="https://ai-rohitmishramanit6459ai171081160941.services.ai.azure.com/models",
    credential=AzureKeyCredential(os.getenv('AZURE_API_KEY'))
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models
class UpdateValueRequest(BaseModel):
    document: Dict[str, Any]
    key: str
    current_value: str
    custom_prompt: Optional[str] = None

class DownloadRequest(BaseModel):
    document: Dict[str, Any]
    format: str

class EditRequest(BaseModel):
    fullContent: str
    selectedText: str
    prompt: str

async def azure_chat_completion(messages):
    loop = asyncio.get_event_loop()
    try:
        response = await loop.run_in_executor(
            None,
            lambda: azure_client.complete({
                "messages": messages,
                "model": "gpt-4o",  # Use your available model
                "max_tokens": 1000,
                "temperature": 0,
                "top_p": 1,
                "stop": []
            })
        )
        return response
    except Exception as e:
        logger.error(f"Azure chat completion failed: {str(e)}")
        raise Exception(f"AI service error: {str(e)}")

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Redirect to default document type"""
    return await copyright_agreement(request)

@app.get("/copyright_agreement", response_class=HTMLResponse)
async def copyright_agreement(request: Request):
    """Render the copyright agreement editor page."""
    try:
        with open('templates/copyright.json', 'r') as f:
            document = json.load(f)
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": document, "document_type": "copyright"}
        )
    except Exception as e:
        logger.error(f"Error loading document: {str(e)}")
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": {"Assignment of copyright": {}}, "document_type": "copyright"}
        )
@app.get("/sublease_agreement", response_class=HTMLResponse)
async def sublease_agreement(request: Request):
    """Render the sublease agreement editor page."""
    try:
        with open('templates/sublease-agreement.json', 'r',encoding='utf-8') as f:
            document = json.load(f)
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": document, "document_type": "sublease"}
        )
    except Exception as e:
        logger.error(f"Error loading document: {str(e)}")
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": {"Sublease Agreement": {}}, "document_type": "sublease"}
        )
@app.get("/service_agreement", response_class=HTMLResponse)
async def service_agreement(request: Request):
    """Render the service agreement editor page."""
    try:
        with open('templates/services-agreement.json', 'r',encoding='utf-8') as f:
            document = json.load(f)
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": document, "document_type": "service"}
        )
    except Exception as e:
        logger.error(f"Error loading document: {str(e)}")
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": {"Services Agreement": {}}, "document_type": "service"}
        )
@app.get("/subcontract", response_class=HTMLResponse)
async def subcontract_agreement(request: Request):
    """Render the service agreement editor page."""
    try:
        with open('templates/subcontractor-agreement.json', 'r',encoding='utf-8') as f:
            document = json.load(f)
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": document, "document_type": "subcontract"}
        )
    except Exception as e:
        logger.error(f"Error loading document: {str(e)}")
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": {"Subcontractor Agreement": {}}, "document_type": "subcontract"}
        )

@app.get("/commission_agreement", response_class=HTMLResponse)
async def commission_agreement(request: Request):
    """Render the commission agreement editor page."""
    try:
        with open('templates/commission.json', 'r') as f:
            document = json.load(f)
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": document, "document_type": "commission"}
        )
    except Exception as e:
        logger.error(f"Error loading document: {str(e)}")
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": {"Assignment of commission agreement": {}}, "document_type": "commission"}
        )

@app.get("/consultancy_agreement", response_class=HTMLResponse)
async def consultancy_agreement(request: Request):
    try:
        with open('templates/ConsultancyAgreement.json', 'r') as f:
            document = json.load(f)
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": document, "document_type": "main"}
        )
    except Exception as e:
        logger.error(f"Error loading document: {str(e)}")
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": {"Consultancy Agreement": {}}, "document_type": "main"}
        )

@app.get("/consultancy_terms", response_class=HTMLResponse)
async def consultancy_terms(request: Request):
    try:
        with open('templates/consultancy-terms.json', 'r') as f:
            document = json.load(f)
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": document, "document_type": "terms"}
        )
    except Exception as e:
        logger.error(f"Error loading document: {str(e)}")
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": {"Consultancy Terms": {}}, "document_type": "terms"}
        )

@app.get("/distribution_agreement", response_class=HTMLResponse)
async def distribution_agreement(request: Request):
    try:
        with open('templates/distribution.json', 'r') as f:
            document = json.load(f)
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": document, "document_type": "distribution"}
        )
    except Exception as e:
        logger.error(f"Error loading document: {str(e)}")
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": {"Distribution Agreement": {}}, "document_type": "distribution"}
        )


@app.get("/foreign_trade", response_class=HTMLResponse)
async def foreign_trade_contract(request: Request):
    """Render the foreign trade contract editor page."""
    try:
        with open("templates/foreign.json", "r", encoding="utf-8") as f:
            document = json.load(f)
    except Exception as e:
        logger.error(f"Error loading document: {str(e)}")
        document = {"Foreign Trade Contract": {}}

    return templates.TemplateResponse(
        "index.html",
        {"request": request, "document": document, "document_type": "foreign"}
    )

@app.get("/nda", response_class=HTMLResponse)
async def nda(request: Request):
    """Render the NDA editor page."""
    try:
        with open('templates/nda.json', 'r') as f:
            document = json.load(f)
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": document, "document_type": "nda"}
        )
    except Exception as e:
        logger.error(f"Error loading document: {str(e)}")
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": {"Non-disclosure agreement": {}}, "document_type": "nda"}
        )

@app.get("/property_management", response_class=HTMLResponse)
async def property_management(request: Request):
    try:
        with open('templates/property-management-agreement.json', 'r') as f:
            document = json.load(f)
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": document, "document_type": "property-management"}
        )
    except Exception as e:
        logger.error(f"Error loading document: {str(e)}")
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": {"Property Management Agreement": {}}, "document_type": "property-management"}
        )
    
@app.get("/supply_agreement", response_class=HTMLResponse)
async def property_management(request: Request):
    try:
        with open('templates/supply.json', 'r') as f:
            document = json.load(f)
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": document, "document_type": "supply-agreement"}
        )
    except Exception as e:
        logger.error(f"Error loading document: {str(e)}")
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": {"Supply agreement": {}}, "document_type": "supply-agreement"}
        )

@app.get("/partnership_agreement", response_class=HTMLResponse)
async def property_management(request: Request):
    try:
        with open('templates/partnership.json', 'r') as f:
            document = json.load(f)
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": document, "document_type": "partnership"}
        )
    except Exception as e:
        logger.error(f"Error loading document: {str(e)}")
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": {"Partnership Agreement": {}}, "document_type": "partnership"}
        )
    
@app.get("/licensing_agreement", response_class=HTMLResponse)
async def property_management(request: Request):
    try:
        with open('templates/licensing-agreement.json', 'r') as f:
            document = json.load(f)
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": document, "document_type": "licensing"}
        )
    except Exception as e:
        logger.error(f"Error loading document: {str(e)}")
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": {"Licensing Agreement": {}}, "document_type": "licensing"}
        )
    
@app.get("/investment_agreement", response_class=HTMLResponse)
async def property_management(request: Request):
    try:
        with open('templates/investment-agreement.json', 'r') as f:
            document = json.load(f)
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": document, "document_type": "investment"}
        )
    except Exception as e:
        logger.error(f"Error loading document: {str(e)}")
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": {"Investment Agreement": {}}, "document_type": "investment"}
        )
@app.get("/employee_contract", response_class=HTMLResponse)
async def property_management(request: Request):
    try:
        with open('templates/employee.json', 'r') as f:
            document = json.load(f)
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": document, "document_type": "employee"}
        )
    except Exception as e:
        logger.error(f"Error loading document: {str(e)}")
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "document": {"Investment Agreement": {}}, "document_type": "employee"}
        )
@app.post("/update_value")
async def update_value(request: EditRequest):
    """Get AI suggestions for editing selected text."""
    logger.info(f"Received edit request for text: {request.selectedText}")

    try:
        response = await azure_chat_completion([
            {
                "role": "system",
                "content": (
                    "You are a legal document editor. Your job is to directly rewrite text passages as instructed. "
                    "CRITICAL INSTRUCTION: You must NEVER include any commentary, labels, or prefixes in your response. "
                    "Your entire response should be ONLY the replacement text itself. "
                    "No 'Edited Text:', no 'Revised Version:', no 'Proposed Edit:', no asterisks, no quotes - just the new text."
                )
            },
            {
                "role": "user",
                "content": f"""
                Edit this legal document text according to the following instructions.

                TEXT TO EDIT:
                {request.selectedText}

                INSTRUCTIONS:
                {request.prompt}

                IMPORTANT: Your response must contain ONLY the replacement text with absolutely no additional commentary, 
                labels, or formatting. Don't wrap it in quotes, don't add 'Edited Text:', don't use any prefixes or suffixes.
                """
            }
        ])

        revised_text = response.choices[0].message.content.strip()

        # Comprehensive post-processing
        # 1. Remove common prefixes with variations
        prefixes_to_remove = [
            "**Proposed Edit:**", "**Edited Text:**", "**Revised Text:**", "**Replacement:**",
            "Proposed Edit:", "Edited Text:", "Revised Text:", "Replacement:",
            "PROPOSED EDIT:", "EDITED TEXT:", "REVISED TEXT:", "REPLACEMENT:",
            "Here's the edited text:", "Edited version:", "Revised version:",
            "Suggested edit:", "Here is the revised text:"
        ]

        for prefix in prefixes_to_remove:
            if revised_text.startswith(prefix):
                revised_text = revised_text.replace(prefix, "", 1).strip()

        # 2. Remove any opening/closing quotes
        if (revised_text.startswith('"') and revised_text.endswith('"')) or \
                (revised_text.startswith("'") and revised_text.endswith("'")):
            revised_text = revised_text[1:-1].strip()

        # 3. Remove any markdown or asterisks
        if revised_text.startswith('*') and revised_text.endswith('*'):
            revised_text = revised_text[1:-1].strip()

        # 4. Handle backtick code formatting
        if revised_text.startswith('```') and revised_text.endswith('```'):
            revised_text = revised_text[3:-3].strip()

        logger.info(f"Final processed text: {revised_text}")
        return {"value": revised_text}

    except Exception as e:
        logger.error(f"Error generating edit: {str(e)}")
        return {"error": str(e)}

@app.post("/download")
async def download(request: DownloadRequest):
    """Generate and download document."""
    if request.format != "pdf":
        return JSONResponse(status_code=400, content={"error": "Format not supported"})

    try:
        template = templates.get_template("pdf_template.html")
        rendered_html = template.render(document=request.document)
        return Response(
            content=rendered_html,
            media_type="text/html",
        )
    except Exception as e:
        logger.error(f"Error generating document: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__== "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
