from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from fastapi.responses import HTMLResponse
from fastapi import Request, HTTPException
import os
import logging

from routers.auth.auth import router as auth_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ENVIRONMENT = os.getenv("ENVIRONMENT", "dev")
IS_PRODUCTION = ENVIRONMENT == "prod"

app = FastAPI(
    title="InsightBoard AI Dashboard API",
    description="A smart dashboard for meeting transcripts and AI-generated action items",
    version="1.0.0",
    root_path="/Prod" if IS_PRODUCTION else "",
    docs_url="/apidocs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

#cors (remember to put vercel frontend url after deploying)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#changed the usual /docs route to show spotlightUI insetad of swagger
@app.get("/docs", include_in_schema=False)
async def api_documentation(request: Request):
    openapi_url = "/Prod/openapi.json" if IS_PRODUCTION else "/openapi.json"
    
    return HTMLResponse(
        f"""
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>InsightBoard AI Dashboard API DOCS</title>

    <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
  </head>
  <body>

    <elements-api
      apiDescriptionUrl="{openapi_url}"
      router="hash"
      theme="dark"
    />

  </body>
</html>"""
    )

#nobody gonna see this but looks cool so yeah idk
@app.get("/", response_class=HTMLResponse)
def home():
    """This is the first and default route for the InsightBoard AI Dashboard Backend"""
    return """
    <html>
      <head>
        <title>InsightBoard AI Dashboard API</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background-color: #f8f9fa; }
          h1 { color: #333; }
          ul { list-style-type: none; padding: 0; }
          li { margin: 10px 0; }
          a { color: #0066cc; text-decoration: none; }
          a:hover { text-decoration: underline; }
          hr { margin: 20px 0; }
          h2 { color: #555; }
        </style>
      </head>
      <body>
        <h1>Welcome to InsightBoard AI Dashboard API</h1>
        <hr>
        <ul>
          <li><a href="/Prod/docs">Spotlight API Documentation</a></li>
          <li><a href="/Prod/redoc">Redoc API Documentation</a></li>
          <li><a href="/Prod/apidocs">Swagger API Documentation</a></li>
          <li><a href="/Prod/openapi.json">OpenAPI Specification</a></li>
          <hr>
          <li><a href="http://localhost:3000">Frontend Website</a></li>
          <hr>
          <h2>InsightBoard AI Dashboard API</h2>
        </ul>
      </body>
    </html>
    """

handler = Mangum(app)

