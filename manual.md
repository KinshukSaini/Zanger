# Lexley BETA – Legal Document Editor

## Overview

Zanger Lexley is a FastAPI-based web application designed to help users create, edit, and download a variety of legal documents using AI-powered suggestions. The app provides editable templates for common legal agreements (e.g., copyright, NDA, partnership, consultancy, manufacturing, etc.), allowing users to customize content with the assistance of Azure OpenAI.

---

## How It Works

### 1. **Architecture**

- **Backend:** Python (FastAPI)
- **Frontend:** Jinja2 templates, JavaScript, CSS
- **AI Integration:** Azure OpenAI (GPT-4o) for text editing and suggestions
- **Static Assets:** Served from `/static`
- **Templates:** JSON-based legal document templates in `/templates`

---

### 2. **Key Features**

#### a. **Document Selection**
- Users can choose from a wide range of legal document types (e.g., NDA, copyright, service agreement, etc.).
- Each document type loads a pre-defined JSON template, rendered as an editable form in the browser.

#### b. **AI-Powered Editing**
- Users can select any section of the document and request AI-powered edits by providing instructions (prompts).
- The backend sends the selected text and user prompt to Azure OpenAI, which returns a revised version.
- The AI is strictly instructed to return only the replacement text, with no extra commentary or formatting.

#### c. **Download as PDF**
- After editing, users can download the finalized document.
- The backend renders the document using a Jinja2 HTML template, which can be converted to PDF (integration-ready).

#### d. **Extensible Templates**
- All document templates are stored as JSON files in the `/templates` directory.
- Adding new document types is as simple as adding a new JSON template and a corresponding route.

---

### 3. **API Endpoints**

- `GET /`: Redirects to the default document editor.
- `GET /<document_type>`: Loads the editor for the specified document type.
- `POST /update_value`: Receives selected text and a prompt, returns AI-edited text.
- `POST /download`: Generates and returns the document as HTML (PDF-ready).

---

### 4. **File Structure**

- `/main.py` – FastAPI application and all backend logic.
- `/templates/` – JSON templates for each document type and HTML templates for rendering.
- `/static/` – JavaScript, CSS, and other static assets for the frontend.

---

### 5. **How to Run**

1. **Install dependencies:**
   ```
   pip install fastapi uvicorn python-dotenv azure-ai-inference tenacity jinja2
   ```

2. **Set up your `.env` file:**
   ```
   AZURE_API_KEY=your_azure_openai_key
   ```

3. **Start the server:**
   ```
   uvicorn main:app --reload
   ```

4. **Open your browser:**
   ```
   http://localhost:8000
   ```

---

### 6. **Customization**

- **Add new document types:**  
  Place a new JSON template in `/templates` and add a new route in `main.py`.
- **Modify AI prompts:**  
  Adjust the system/user prompt in the `/update_value` endpoint for different editing behaviors.
- **Frontend changes:**  
  Edit `/static/main.js` and `/templates/index.html` for UI/UX improvements.

---

## Security & Privacy

- All AI requests are processed server-side; user data is not stored or shared.
- CORS is enabled for all origins (for development); restrict in production as needed.

---

## Limitations

- There is a lot of redundant code in the js files, which makes it hard to add new templates to the app.
- the manual editting is buggy, and reloads whenever some question is filled.
- PDF generation is currently HTML-based; for true PDF output, integrate a library like WeasyPrint or pdfkit.
- AI edits depend on Azure OpenAI availability and API limits.



---

### 1. **Template Loading**
- When a user selects a document type, the frontend JavaScript fetches the corresponding JSON template from the `/templates` directory.
- Each JSON template contains the structure, fields, and default content for that document type.

### 2. **Dynamic Form Generation**
- The main JavaScript file (`/static/main.js`) parses the loaded JSON and dynamically generates the editable form or preview in the browser.
- Fields, questions, and sections are rendered based on the JSON schema, allowing for flexible and extensible document types.

### 3. **User Interaction & Editing**
- Users can edit fields directly in the browser. When a user selects a section and requests an AI edit, the selected text and user prompt are sent to the backend via an API call (`/update_value`).
- The JavaScript handles capturing the selected text, user instructions, and updating the UI with the AI-generated response.

### 4. **Saving & Downloading**
- When the user is ready to download, the current state of the document (as JSON) is sent to the backend via the `/download` endpoint.
- The backend uses the JSON data to render a final HTML (or PDF-ready) document using Jinja2 templates.

### 5. **Extensibility**
- To add a new document type, simply add a new JSON template in `/templates` and ensure the JavaScript can interpret its structure.
- The goal is to standardize the JSON schema so that a single JavaScript file can handle all document types, reducing redundancy and making the app scalable.

---

## In-Depth: How JavaScript and JSON Work Together (NDA Example)

The NDA document flow demonstrates the deep integration between the JSON template (`/templates/nda.json`) and the JavaScript logic (`/static/nda.js`). Here’s how they work together:

### 1. **JSON as the Source of Truth**
- The NDA JSON file defines the entire structure, sections, and default content of the agreement, including placeholders (e.g., `*[INDIVIDUAL NAME]*`) and options (e.g., `[indefinitely] OR [until *[date]*]`).
- It also specifies the display order for main and agreement sections, ensuring consistent rendering.

### 2. **Dynamic UI Generation**
- The JavaScript (`nda.js`) reads the JSON template and, using the `documentQuestions` object, generates a dynamic questionnaire for the user.
- Each question is mapped to a specific path in the JSON (using `documentPathMap`), so user input can be precisely inserted into the correct place in the document structure.

### 3. **Two-Way Data Binding**
- As users fill out the form, their answers are stored in `formDataStore`.
- When a value changes, JavaScript updates the JSON template in memory, replacing placeholders with user data. This is done by flattening the JSON, applying changes, and unflattening it back to a nested structure.
- The preview pane is updated in real time, showing the user exactly how their inputs affect the final document.

### 4. **Conditional Logic & Placeholders**
- The JSON template uses placeholders and OR options (e.g., `[INDIVIDUAL NAME]` or `[COMPANY NAME]`) to support both individual and company parties.
- JavaScript uses the user's selections (e.g., party type) to determine which placeholders to fill and which sections to show/hide, ensuring the document is always contextually correct.

### 5. **Validation and User Guidance**
- Validation rules in JavaScript ensure that user inputs are correct (e.g., valid dates, required fields).
- Errors are shown inline, and only valid data is written back to the JSON template.

### 6. **AI Editing Integration**
- Users can select any section of the previewed document and request an AI-powered edit.
- JavaScript captures the selected text and user prompt, sends it to the backend, and updates the JSON template with the AI’s response, maintaining the document’s structure.

### 7. **Download and Export**
- When the user downloads the document, JavaScript serializes the current state of the JSON (with all user data applied) and sends it to the backend for rendering as HTML or PDF.
- This ensures the downloaded document matches exactly what the user saw in the preview.

### 8. **Extensibility**
- The same JavaScript logic can be reused for other document types by providing a new JSON template and updating the question mappings.
- This separation of structure (JSON) and logic (JS) makes the system highly scalable and maintainable.

---
## Improvements / Scalability (*IMPORTANT*)
- This app is hard to scale as mentioned above due to redundancy in the js files, and also because the json for each doc often looks different from the rest.

- A major step forward would be to :
1. First create a standard json structure for converting the docs into json, and also store the stores for questions and fields along it in the json itself.
2. and then create a single js file to use the information from the json and use it to generate the preview and the questionnaire.
---
## Credits

Developed by [Rudra Kumar, Kinshuk Saini, Piyush Yadav].