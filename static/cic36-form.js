// Document order configuration
const sectionOrder = [
  "FORM_HEADER",
  "COMPANY_NAME_HEADER_SECTION",
  "SECTION_A_BENEFICIARIES", 
  "COMPANY_NAME_REPEAT_SECTION",
  "SECTION_B_ACTIVITIES",
  "COMPANY_NAME_REPEAT_SECTION_2",
  "SECTION_C_POLITICAL_DECLARATIONS",
  "SECTION_D_SIGNATURES",
  "CONTACT_INFORMATION",
  "CHECKLIST",
  "SUBMISSION_INSTRUCTIONS",
  "FOOTNOTES"
];

// Smart label detection patterns
const INTERNAL_FIELDS_TO_HIDE = ["content", "form_number", "title", "footnote_reference", "header_table", "section_marker", "declaration_number", "instruction_text", "warnings", "headers", "director_rows", "privacy_note", "contact_table", "notes_header"];
const NUMBERED_PATTERN = /^\d+$/; // Show "1.", "2.", etc.
const CLAUSE_PATTERN = /^\d+\.\d+$/; // Show "1.1:", "2.1:", etc.
const LETTER_PATTERN = /^[a-z]$/; // Show "(a)", "(b)", etc.

// Document template to store original structure
let documentTemplate = null;

/**
 * Flattens a nested object into a flat object with dot notation keys
 */
function flattenObject(obj, prefix = "") {
  return Object.keys(obj).reduce((acc, key) => {
    const prefixedKey = prefix ? `${prefix}.${key}` : key;

    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      Object.assign(acc, flattenObject(obj[key], prefixedKey));
    } else {
      acc[prefixedKey] = obj[key];
    }

    return acc;
  }, {});
}

/**
 * Unflatten a flat object with dot notation keys back into a nested object
 */
function unflattenObject(flatObj) {
  const result = {};

  Object.keys(flatObj).forEach((key) => {
    const value = flatObj[key];
    const keys = splitPath(key);
    let current = result;

    keys.forEach((k, i) => {
      if (i === keys.length - 1) {
        current[k] = value;
      } else {
        current[k] = current[k] || {};
        current = current[k];
      }
    });
  });

  return result;
}

/**
 * Initialize the document template
 */
function initializeDocumentTemplate() {
  documentTemplate = JSON.parse(JSON.stringify(window.currentDocument));
}

/**
 * Get a clean copy of the document template
 */
function getDocumentTemplate() {
  if (!documentTemplate) {
    initializeDocumentTemplate();
  }
  return JSON.parse(JSON.stringify(documentTemplate));
}

// Global variables for AI editing
let selectedText = "";
let selectionRange = null;

function handleTextSelection() {
  const selection = window.getSelection();

  if (
    selection.toString().trim().length > 0 &&
    document.getElementById("documentPreview").contains(selection.anchorNode)
  ) {
    selectedText = selection.toString();
    selectionRange = selection.getRangeAt(0);
    const rect = selectionRange.getBoundingClientRect();
    showEditWithAIButton(rect);
  } else {
    const editButton = document.getElementById("edit-ai-button");
    if (editButton) {
      editButton.remove();
    }
  }
}

function showEditWithAIButton(rect) {
  const existingButton = document.getElementById("edit-ai-button");
  if (existingButton) {
    existingButton.remove();
  }

  const editButton = document.createElement("div");
  editButton.id = "edit-ai-button";
  editButton.className = "floating-edit-button";
  editButton.innerHTML = `<button class="btn btn-edit">Edit with AI</button>`;
  editButton.style.position = "absolute";
  editButton.style.left = `${rect.left + window.scrollX}px`;
  editButton.style.top = `${rect.bottom + window.scrollY + 5}px`;
  editButton.style.zIndex = "1000";

  editButton.querySelector("button").addEventListener("click", openEditDialog);
  document.body.appendChild(editButton);
}

function openEditDialog() {
  let dialog = document.getElementById("edit-ai-dialog");

  if (!dialog) {
    dialog = document.createElement("div");
    dialog.id = "edit-ai-dialog";
    dialog.className = "modal";
    dialog.innerHTML = `
      <div class="modal-content">
        <span class="close" onclick="closeEditDialog()">&times;</span>
        <h3>Edit with AI</h3>
        <div class="edit-dialog-body">
          <div>
            <p><strong>Selected Text:</strong></p>
            <div id="selected-text-display" class="selected-text-box"></div>
          </div>
          <div>
            <p><strong>How would you like to modify this text?</strong></p>
            <textarea id="ai-edit-prompt" class="prompt-input" placeholder="Enter your instructions for the AI..."></textarea>
          </div>
        </div>
        <div class="modal-buttons">
          <button class="btn btn-cancel" onclick="closeEditDialog()">Cancel</button>
          <button class="btn btn-edit" id="submit-ai-edit">Update Text</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
    document.getElementById("submit-ai-edit").addEventListener("click", submitAIEditRequest);
  }

  document.getElementById("selected-text-display").textContent = selectedText;
  dialog.style.display = "block";

  const editButton = document.getElementById("edit-ai-button");
  if (editButton) {
    editButton.remove();
  }
}

function closeEditDialog() {
  const dialog = document.getElementById("edit-ai-dialog");
  if (dialog) {
    dialog.style.display = "none";
    document.getElementById("ai-edit-prompt").value = "";
  }
}

function submitAIEditRequest() {
  const prompt = document.getElementById("ai-edit-prompt").value;
  if (!prompt.trim()) {
    alert("Please enter instructions for the AI.");
    return;
  }

  const fullContent = document.getElementById("documentPreview").innerHTML;
  const submitButton = document.getElementById("submit-ai-edit");
  const originalText = submitButton.textContent;
  submitButton.textContent = "Processing...";
  submitButton.disabled = true;

  fetch("/update_value", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      selectedText: selectedText,
      prompt: prompt,
      fullContent: fullContent,
    }),
  })
    .then((response) => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    })
    .then((data) => {
      if (data.error) throw new Error(data.error);
      updateDocumentWithAIResponse(data.value);
      closeEditDialog();
    })
    .catch((error) => {
      alert("Error: " + error.message);
    })
    .finally(() => {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    });
}

function updateDocumentWithAIResponse(newText) {
  if (!selectionRange) return;

  selectionRange.deleteContents();
  const textNode = document.createTextNode(newText);
  selectionRange.insertNode(textNode);

  selectedText = "";
  selectionRange = null;

  const successMessage = document.createElement("div");
  successMessage.className = "success";
  successMessage.textContent = "Text updated successfully";
  successMessage.style.position = "fixed";
  successMessage.style.bottom = "20px";
  successMessage.style.right = "20px";
  successMessage.style.padding = "10px 20px";
  document.body.appendChild(successMessage);

  setTimeout(() => {
    successMessage.remove();
  }, 3000);
}

// Enhanced questionnaire for CIC 36 Form
const documentQuestions = {
  step1: {
    title: "Company Information",
    companyName: {
      question: "Enter the full company name",
      type: "text",
      placeholder: "e.g., Green Solutions Community Interest Company",
      required: true
    },
  },
  step2: {
    title: "Community Interest Statement - Beneficiaries",
    communityDescription: {
      question: "Describe the community or section of the community that will benefit",
      type: "textarea",
      placeholder: "e.g., 'the residents of Oldtown' or 'those suffering from mental health issues'",
      required: true,
      rows: 4
    },
  },
  step3: {
    title: "Activities & Related Benefit",
    companyActivities: {
      question: "Describe the day-to-day activities of the company",
      type: "textarea",
      placeholder: "Provide detailed description of what the company will do...",
      required: true,
      rows: 8
    },
    activityBenefit: {
      question: "How will these activities benefit the community?",
      type: "textarea",
      placeholder: "Explain how your activities will create community benefit...",
      required: true,
      rows: 6
    },
    surplusUsage: {
      question: "If the company makes any surplus, it will be used for...",
      type: "textarea",
      placeholder: "Describe how any surplus will be used for community benefit...",
      required: true,
      rows: 4
    },
  },
  step4: {
    title: "Directors Information",
    directorCount: {
      question: "How many directors will the company have?",
      type: "select",
      options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
      required: true
    },
    director1Name: {
      question: "Director 1 - Full Name",
      type: "text",
      placeholder: "Full legal name",
      showIf: "directorCount",
      required: true
    },
    director1SignatureDate: {
      question: "Director 1 - Signature Date", 
      type: "date",
      showIf: "directorCount",
      required: true
    },
    director2Name: {
      question: "Director 2 - Full Name",
      type: "text",
      placeholder: "Full legal name",
      showIf: "directorCount",
      minDirectors: 2
    },
    director2SignatureDate: {
      question: "Director 2 - Signature Date",
      type: "date", 
      showIf: "directorCount",
      minDirectors: 2
    },
    director3Name: {
      question: "Director 3 - Full Name",
      type: "text",
      placeholder: "Full legal name",
      showIf: "directorCount",
      minDirectors: 3
    },
    director3SignatureDate: {
      question: "Director 3 - Signature Date",
      type: "date",
      showIf: "directorCount", 
      minDirectors: 3
    },
    director4Name: {
      question: "Director 4 - Full Name",
      type: "text",
      placeholder: "Full legal name",
      showIf: "directorCount",
      minDirectors: 4
    },
    director4SignatureDate: {
      question: "Director 4 - Signature Date",
      type: "date",
      showIf: "directorCount",
      minDirectors: 4
    },
    director5Name: {
      question: "Director 5 - Full Name",
      type: "text",
      placeholder: "Full legal name",
      showIf: "directorCount",
      minDirectors: 5
    },
    director5SignatureDate: {
      question: "Director 5 - Signature Date",
      type: "date",
      showIf: "directorCount",
      minDirectors: 5
    },
    director6Name: {
      question: "Director 6 - Full Name",
      type: "text",
      placeholder: "Full legal name",
      showIf: "directorCount",
      minDirectors: 6
    },
    director6SignatureDate: {
      question: "Director 6 - Signature Date",
      type: "date",
      showIf: "directorCount",
      minDirectors: 6
    },
    director7Name: {
      question: "Director 7 - Full Name",
      type: "text",
      placeholder: "Full legal name",
      showIf: "directorCount",
      minDirectors: 7
    },
    director7SignatureDate: {
      question: "Director 7 - Signature Date",
      type: "date",
      showIf: "directorCount",
      minDirectors: 7
    },
    director8Name: {
      question: "Director 8 - Full Name",
      type: "text",
      placeholder: "Full legal name",
      showIf: "directorCount",
      minDirectors: 8
    },
    director8SignatureDate: {
      question: "Director 8 - Signature Date",
      type: "date",
      showIf: "directorCount",
      minDirectors: 8
    },
    director9Name: {
      question: "Director 9 - Full Name",
      type: "text",
      placeholder: "Full legal name",
      showIf: "directorCount",
      minDirectors: 9
    },
    director9SignatureDate: {
      question: "Director 9 - Signature Date",
      type: "date",
      showIf: "directorCount",
      minDirectors: 9
    },
    director10Name: {
      question: "Director 10 - Full Name",
      type: "text",
      placeholder: "Full legal name",
      showIf: "directorCount",
      minDirectors: 10
    },
    director10SignatureDate: {
      question: "Director 10 - Signature Date",
      type: "date",
      showIf: "directorCount",
      minDirectors: 10
    },
  },
  step5: {
    title: "Contact Information (Optional)",
    contactName: {
      question: "Contact person name",
      type: "text",
      placeholder: "Full name of contact person"
    },
    contactAddress: {
      question: "Contact address",
      type: "textarea",
      placeholder: "Full contact address",
      rows: 3
    },
    contactEmail: {
      question: "Email address",
      type: "email",
      placeholder: "contact@example.com"
    },
    contactTelephone: {
      question: "Telephone number",
      type: "tel",
      placeholder: "01234 567890"
    },
    contactDXNumber: {
      question: "DX Number (if applicable)",
      type: "text",
      placeholder: "DX Number"
    },
    contactDXExchange: {
      question: "DX Exchange (if applicable)",
      type: "text",
      placeholder: "DX Exchange"
    },
  },
};

// Document path mapping for CIC 36 form fields
const documentPathMap = {
  // Company name (appears in multiple places)
  "companyName": [
    "CIC 36 Form.COMPANY_NAME_HEADER_SECTION.header_table.company_name_field",
    "CIC 36 Form.COMPANY_NAME_REPEAT_SECTION.company_name_field",
    "CIC 36 Form.COMPANY_NAME_REPEAT_SECTION_2.company_name_field"
  ],
  
  // Section A - Community Interest Statement
  "communityDescription": ["CIC 36 Form.SECTION_A_BENEFICIARIES.community_description_field.placeholder"],
  
  // Section B - Activities
  "companyActivities": ["CIC 36 Form.SECTION_B_ACTIVITIES.activities_subsection.activities_text_area.placeholder"],
  "activityBenefit": ["CIC 36 Form.SECTION_B_ACTIVITIES.activities_subsection.benefit_text_area.placeholder"],
  "surplusUsage": ["CIC 36 Form.SECTION_B_ACTIVITIES.surplus_usage_section.surplus_text_area.placeholder"],
  
  // Directors
  "directorCount": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table"],
  "director1Name": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_1.name_field"],
  "director1SignatureDate": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_1.date_field"],
  "director2Name": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_2.name_field"],
  "director2SignatureDate": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_2.date_field"],
  "director3Name": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_3.name_field"],
  "director3SignatureDate": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_3.date_field"],
  "director4Name": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_4.name_field"],
  "director4SignatureDate": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_4.date_field"],
  "director5Name": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_5.name_field"],
  "director5SignatureDate": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_5.date_field"],
  "director6Name": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_6.name_field"],
  "director6SignatureDate": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_6.date_field"],
  "director7Name": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_7.name_field"],
  "director7SignatureDate": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_7.date_field"],
  "director8Name": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_8.name_field"],
  "director8SignatureDate": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_8.date_field"],
  "director9Name": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_9.name_field"],
  "director9SignatureDate": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_9.date_field"],
  "director10Name": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_10.name_field"],
  "director10SignatureDate": ["CIC 36 Form.SECTION_D_SIGNATURES.signature_table.director_rows.director_10.date_field"],
  
  // Contact information
  "contactName": ["CIC 36 Form.CONTACT_INFORMATION.contact_table.name_address_section.name_field"],
  "contactAddress": ["CIC 36 Form.CONTACT_INFORMATION.contact_table.name_address_section.address_field.placeholder"],
  "contactEmail": ["CIC 36 Form.CONTACT_INFORMATION.contact_table.communication_details.email_field"],
  "contactTelephone": ["CIC 36 Form.CONTACT_INFORMATION.contact_table.communication_details.telephone_field"],
  "contactDXNumber": ["CIC 36 Form.CONTACT_INFORMATION.contact_table.communication_details.dx_number_field"],
  "contactDXExchange": ["CIC 36 Form.CONTACT_INFORMATION.contact_table.communication_details.dx_exchange_field"],
};

/**
 * Enhanced highlighting with better section detection
 */
function highlightDocumentSection(fieldId) {
  clearHighlights();

  const paths = documentPathMap[fieldId];
  if (!paths || paths.length === 0) return;

  const previewElem = document.getElementById("documentPreview");
  paths.forEach(path => {
    // Find exact path matches first
    let elements = previewElem.querySelectorAll(`[data-value-path="${path}"]`);

    if (elements.length === 0) {
      // Try finding section containers
      const pathParts = path.split('.');
      for (let i = pathParts.length - 1; i >= 0; i--) {
        const partialPath = pathParts.slice(0, i + 1).join('.');
        elements = previewElem.querySelectorAll(`[data-path="${partialPath}"]`);
        if (elements.length > 0) break;
      }
    }

    elements.forEach(elem => {
      elem.classList.add("highlighted-section");
    });
  });

  // Scroll to first highlighted element
  setTimeout(() => {
    const firstHighlighted = document.querySelector(".highlighted, .highlighted-section");
    if (firstHighlighted) {
      firstHighlighted.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 1);
}

/**
 * Clear all highlighting
 */
function clearHighlights() {
  const previewElem = document.getElementById("documentPreview");
  const highlightedElements = previewElem.querySelectorAll(".highlighted, .highlighted-section");
  highlightedElements.forEach(element => {
    element.classList.remove("highlighted");
    element.classList.remove("highlighted-section");
  });
}

// Store form data between steps
let formDataStore = {};

document.addEventListener("DOMContentLoaded", async function () {
  console.log("Document initialization started");
  if (!window.currentDocument) {
    console.error("No document found in window.currentDocument");
    window.currentDocument = { "CIC 36 Form": {} };
  }

  try {
    initializeDocumentTemplate();
    showQuestionnaire();
    updatePreview();
    setTimeout(registerHighlightEvents, 500);

    const previewElem = document.getElementById("documentPreview");
    if (previewElem) {
      previewElem.addEventListener("mouseup", handleTextSelection);
      previewElem.addEventListener("keyup", handleTextSelection);
    }

    console.log("Document initialization completed");
  } catch (error) {
    console.error("Error during initialization:", error);
  }
});

/**
 * Enhanced document to HTML conversion for CIC 36 form
 */
function convertToHtml(document) {
  let html = [];
  const documentTitle = Object.keys(document)[0];

  if (documentTitle) {
    const mainContent = document[documentTitle];
    sectionOrder.forEach((section) => {
      if (mainContent[section]) {
        processSection(section, mainContent[section], 0, documentTitle);
      }
    });
  }
  return html.join("");

  function processSection(key, value, level, path) {
    const currentPath = path ? `${path}.${key}` : key;

    if (key === "FORM_HEADER") {
      // Form header
      html.push(`
        <div class="form-header" data-path="${currentPath}" style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">
            <span data-value-path="${currentPath}.form_number">${value.form_number}</span>
          </h1>
          <h2 style="font-size: 18px; margin-bottom: 20px;">
            <span data-value-path="${currentPath}.title">${value.title}</span>
            ${value.footnote_reference ? `<sup>${value.footnote_reference}</sup>` : ''}
          </h2>
        </div>
      `);
    } else if (key === "COMPANY_NAME_HEADER_SECTION" || key === "COMPANY_NAME_REPEAT_SECTION" || key === "COMPANY_NAME_REPEAT_SECTION_2") {
      // Company name sections
      const isHeader = key === "COMPANY_NAME_HEADER_SECTION";
      const headerTable = isHeader ? value.header_table : value;
      
      html.push(`
        <div class="company-name-section" data-path="${currentPath}" style="margin: 30px 0; border: 2px solid #000;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 15px; border-right: 1px solid #000; font-weight: bold; width: 200px;">
                ${isHeader ? headerTable.company_name_label : 'COMPANY NAME'}
              </td>
              <td style="padding: 15px; min-height: 60px; vertical-align: top;">
                <div data-value-path="${currentPath}.${isHeader ? 'header_table.' : ''}company_name_field" style="min-height: 40px; border-bottom: 1px solid #ccc; padding: 5px;">
                  ${(isHeader ? headerTable.company_name_field : value.company_name_field) || '______'}
                </div>
              </td>
            </tr>
            ${isHeader ? `
            <tr>
              <td colspan="2" style="padding: 10px; font-style: italic; background-color: #f5f5f5;">
                <span data-value-path="${currentPath}.header_table.consistency_note">${headerTable.consistency_note}</span>
              </td>
            </tr>
            ` : `
            <tr>
              <td colspan="2" style="padding: 10px; font-style: italic; background-color: #f5f5f5;">
                <span data-value-path="${currentPath}.consistency_reminder">${value.consistency_reminder}</span>
              </td>
            </tr>
            `}
          </table>
        </div>
      `);
    } else if (key === "SECTION_A_BENEFICIARIES") {
      // Section A - Community Interest Statement
      html.push(`
        <div class="section-a" data-path="${currentPath}" style="margin: 30px 0; border: 2px solid #000;">
          <div style="background-color: #f0f0f0; padding: 15px; border-bottom: 1px solid #000;">
            <h3 style="font-weight: bold; margin: 0;">
              <span data-value-path="${currentPath}.section_title">${value.section_title}</span>
            </h3>
          </div>
          <div style="padding: 20px;">
            <p style="margin-bottom: 15px;">
              <strong>${value.declaration_number}</strong>
              <span data-value-path="${currentPath}.declaration_text">${value.declaration_text}</span>
              <sup>${value.declaration_footnote}</sup>.
            </p>
            <p style="font-style: italic; margin-bottom: 15px;">
              <span data-value-path="${currentPath}.instruction_text">${value.instruction_text}</span>
              <sup>${value.instruction_footnote}</sup>
            </p>
            <p style="margin-bottom: 10px;">
              <em><span data-value-path="${currentPath}.benefit_description_prompt">${value.benefit_description_prompt}</span></em>
            </p>
            <div data-value-path="${currentPath}.community_description_field.placeholder" style="min-height: 100px; border: 1px solid #ccc; padding: 10px; background-color: #fafafa;">
              ${getFieldValue('communityDescription', formDataStore) || value.community_description_field.placeholder}
            </div>
          </div>
        </div>
      `);
    } else if (key === "SECTION_B_ACTIVITIES") {
      // Section B - Activities
      html.push(`
        <div class="section-b" data-path="${currentPath}" style="margin: 30px 0; border: 2px solid #000;">
          <div style="background-color: #f0f0f0; padding: 15px; border-bottom: 1px solid #000;">
            <h3 style="font-weight: bold; margin: 0;">
              <span data-value-path="${currentPath}.section_title">${value.section_title}</span>
            </h3>
            <p style="margin: 10px 0 0 0; font-style: italic;">
              <span data-value-path="${currentPath}.instruction_text">${value.instruction_text}</span>
            </p>
          </div>
          <div style="padding: 20px;">
            <div style="margin-bottom: 30px;">
              <h4 style="font-weight: bold; margin-bottom: 10px;">
                <span data-value-path="${currentPath}.activities_subsection.label">${value.activities_subsection.label}</span>
              </h4>
              <p style="font-style: italic; margin-bottom: 10px;">
                <span data-value-path="${currentPath}.activities_subsection.instruction">${value.activities_subsection.instruction}</span>
              </p>
              <div data-value-path="${currentPath}.activities_subsection.activities_text_area.placeholder" style="min-height: 150px; border: 1px solid #ccc; padding: 10px; background-color: #fafafa; margin-bottom: 20px;">
                ${getFieldValue('companyActivities', formDataStore) || value.activities_subsection.activities_text_area.placeholder}
              </div>
              
              <p style="font-weight: bold; margin-bottom: 10px;">
                <span data-value-path="${currentPath}.activities_subsection.primary_question">${value.activities_subsection.primary_question}</span>
              </p>
              <p style="font-style: italic; margin-bottom: 10px;">
                <span data-value-path="${currentPath}.activities_subsection.secondary_question">${value.activities_subsection.secondary_question}</span>
              </p>
              <div data-value-path="${currentPath}.activities_subsection.benefit_text_area.placeholder" style="min-height: 120px; border: 1px solid #ccc; padding: 10px; background-color: #fafafa;">
                ${getFieldValue('activityBenefit', formDataStore) || value.activities_subsection.benefit_text_area.placeholder}
              </div>
            </div>
            
            <div style="margin-bottom: 20px;">
              <p style="font-weight: bold; margin-bottom: 5px;">
                <span data-value-path="${currentPath}.surplus_usage_section.prompt">${value.surplus_usage_section.prompt}</span>
              </p>
              <p style="font-style: italic; font-size: 12px; margin-bottom: 10px; color: #666;">
                <span data-value-path="${currentPath}.surplus_usage_section.regulatory_note">${value.surplus_usage_section.regulatory_note}</span>
              </p>
              <div data-value-path="${currentPath}.surplus_usage_section.surplus_text_area.placeholder" style="min-height: 80px; border: 1px solid #ccc; padding: 10px; background-color: #fafafa;">
                ${getFieldValue('surplusUsage', formDataStore) || value.surplus_usage_section.surplus_text_area.placeholder}
              </div>
            </div>
            
            <p style="font-style: italic; text-align: center;">
              <span data-value-path="${currentPath}.continuation_note">${value.continuation_note}</span>
            </p>
          </div>
        </div>
      `);
    } else if (key === "SECTION_C_POLITICAL_DECLARATIONS") {
      // Section C - Political Declarations
      html.push(`
        <div class="section-c" data-path="${currentPath}" style="margin: 30px 0; border: 2px solid #000;">
          <div style="background-color: #f0f0f0; padding: 15px; border-bottom: 1px solid #000;">
            <h3 style="font-weight: bold; margin: 0;">
              <span data-value-path="${currentPath}.section_title">${value.section_title}</span>
            </h3>
          </div>
          <div style="padding: 20px;">
            <p style="margin-bottom: 15px;">
              <span data-value-path="${currentPath}.declaration_text">${value.declaration_text}</span>
            </p>
            <div style="margin-left: 20px;">
              <p><span data-value-path="${currentPath}.exclusions.a">(a) ${value.exclusions.a}</span></p>
              <p><span data-value-path="${currentPath}.exclusions.b">(b) ${value.exclusions.b}</span></p>
              <p><span data-value-path="${currentPath}.exclusions.c">(c) ${value.exclusions.c}</span><sup>${value.exclusions_footnote}</sup></p>
            </div>
          </div>
        </div>
      `);
    } else if (key === "SECTION_D_SIGNATURES") {
      // Section D - Director Signatures
      html.push(generateDirectorSignatureTable(currentPath, value, formDataStore));
    } else if (key === "CONTACT_INFORMATION") {
      // Contact Information
      html.push(`
        <div class="contact-info" data-path="${currentPath}" style="margin: 30px 0; border: 2px solid #000;">
          <div style="padding: 20px;">
            <p style="font-style: italic; margin-bottom: 20px; font-size: 12px;">
              <span data-value-path="${currentPath}.privacy_note">${value.privacy_note}</span>
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 50%; padding: 15px; border-right: 1px solid #ccc; vertical-align: top;">
                  <div style="margin-bottom: 20px;">
                    <label style="font-weight: bold;">Name:</label>
                    <div data-value-path="${currentPath}.contact_table.name_address_section.name_field" style="border-bottom: 1px solid #ccc; padding: 5px; min-height: 25px;">
                      ${getFieldValue('contactName', formDataStore) || ''}
                    </div>
                  </div>
                  <div>
                    <label style="font-weight: bold;">Address:</label>
                    <div data-value-path="${currentPath}.contact_table.name_address_section.address_field.placeholder" style="border: 1px solid #ccc; padding: 10px; min-height: 80px;">
                      ${getFieldValue('contactAddress', formDataStore) || value.contact_table.name_address_section.address_field.placeholder}
                    </div>
                  </div>
                </td>
                <td style="width: 50%; padding: 15px; vertical-align: top;">
                  <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold;">Email:</label>
                    <div data-value-path="${currentPath}.contact_table.communication_details.email_field" style="border-bottom: 1px solid #ccc; padding: 5px; min-height: 25px;">
                      ${getFieldValue('contactEmail', formDataStore) || ''}
                    </div>
                  </div>
                  <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold;">Tel:</label>
                    <div data-value-path="${currentPath}.contact_table.communication_details.telephone_field" style="border-bottom: 1px solid #ccc; padding: 5px; min-height: 25px;">
                      ${getFieldValue('contactTelephone', formDataStore) || ''}
                    </div>
                  </div>
                  <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold;">DX Number:</label>
                    <div data-value-path="${currentPath}.contact_table.communication_details.dx_number_field" style="border-bottom: 1px solid #ccc; padding: 5px; min-height: 25px;">
                      ${getFieldValue('contactDXNumber', formDataStore) || ''}
                    </div>
                  </div>
                  <div>
                    <label style="font-weight: bold;">DX Exchange:</label>
                    <div data-value-path="${currentPath}.contact_table.communication_details.dx_exchange_field" style="border-bottom: 1px solid #ccc; padding: 5px; min-height: 25px;">
                      ${getFieldValue('contactDXExchange', formDataStore) || ''}
                    </div>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        </div>
      `);
    } else if (key === "CHECKLIST") {
      // Checklist
      html.push(`
        <div class="checklist" data-path="${currentPath}" style="margin: 30px 0; border: 2px solid #000;">
          <div style="background-color: #f0f0f0; padding: 15px; border-bottom: 1px solid #000;">
            <h3 style="font-weight: bold; margin: 0; text-align: center;">
              <span data-value-path="${currentPath}.title">${value.title}</span>
            </h3>
          </div>
          <div style="padding: 20px;">
            <div style="margin-bottom: 20px;">
              <h4 style="font-weight: bold; margin-bottom: 10px;">
                <span data-value-path="${currentPath}.all_applications.subtitle">${value.all_applications.subtitle}</span>
              </h4>
              <ul style="margin-left: 20px;">
                ${value.all_applications.requirements.map((req, index) => 
                  `<li style="margin-bottom: 5px;">${req}</li>`
                ).join('')}
              </ul>
            </div>
            <div>
              <h4 style="font-weight: bold; margin-bottom: 10px;">
                <span data-value-path="${currentPath}.hardcopy_applications.subtitle">${value.hardcopy_applications.subtitle}</span>
              </h4>
              <p style="margin-bottom: 10px;">
                <span data-value-path="${currentPath}.hardcopy_applications.instruction">${value.hardcopy_applications.instruction}</span>
              </p>
              <ul style="margin-left: 20px;">
                ${Object.entries(value.hardcopy_applications.required_documents).map(([letter, doc]) => 
                  `<li style="margin-bottom: 5px;">(${letter}) ${doc}</li>`
                ).join('')}
              </ul>
            </div>
          </div>
        </div>
      `);
    } else if (key === "SUBMISSION_INSTRUCTIONS") {
      // Submission Instructions
      html.push(`
        <div class="submission-instructions" data-path="${currentPath}" style="margin: 30px 0; border: 2px solid #000;">
          <div style="padding: 20px;">
            <p style="margin-bottom: 15px;">
              <span data-value-path="${currentPath}.completion_instruction">${value.completion_instruction}</span>
            </p>
            <h4 style="font-weight: bold; margin-bottom: 10px;">
              <span data-value-path="${currentPath}.registration_scope.scope_text">${value.registration_scope.scope_text}</span>
            </h4>
            <p style="margin-bottom: 10px;">
              <span data-value-path="${currentPath}.delivery_address">${value.delivery_address}</span>
            </p>
            <p>
              <span data-value-path="${currentPath}.dx_reference">${value.dx_reference}</span>
            </p>
          </div>
        </div>
      `);
    } else if (key === "FOOTNOTES") {
      // Footnotes
      html.push(`
        <div class="footnotes" data-path="${currentPath}" style="margin: 40px 0; border-top: 2px solid #000; padding-top: 20px;">
          <h3 style="font-weight: bold; margin-bottom: 20px;">
            <span data-value-path="${currentPath}.notes_header">${value.notes_header}</span>
          </h3>
          ${Object.entries(value).filter(([key]) => key !== 'notes_header').map(([footnoteKey, footnoteValue]) => 
            `<div class="footnote" style="margin-bottom: 15px; font-size: 12px; line-height: 1.4;">
              <sup>${footnoteKey}</sup> 
              <span data-value-path="${currentPath}.${footnoteKey}.content">${footnoteValue.content}</span>
            </div>`
          ).join('')}
        </div>
      `);
    }
  }
}

function generateDirectorSignatureTable(currentPath, value, formData) {
  const directorCount = parseInt(formData.directorCount) || 1;
  
  let tableHTML = `
    <div class="section-d-signatures" data-path="${currentPath}" style="margin: 30px 0; border: 2px solid #000;">
      <div style="background-color: #f0f0f0; padding: 15px; border-bottom: 1px solid #000;">
        <h3 style="font-weight: bold; margin: 0;">
          <span data-value-path="${currentPath}.section_title">${value.section_title}</span>
        </h3>
        <div style="margin-top: 10px;">
          <p style="font-weight: bold; color: red; margin: 5px 0;">
            <span data-value-path="${currentPath}.warnings.completion_warning">${value.warnings.completion_warning}</span>
          </p>
          <p style="font-weight: bold; color: red; margin: 5px 0;">
            <span data-value-path="${currentPath}.warnings.signature_warning">${value.warnings.signature_warning}</span>
          </p>
        </div>
      </div>
      <div style="padding: 20px;">
        <p style="margin-bottom: 15px;">
          <span data-value-path="${currentPath}.signing_requirement">${value.signing_requirement}</span>
        </p>
        <p style="font-style: italic; margin-bottom: 20px; font-size: 12px;">
          <span data-value-path="${currentPath}.signature_methods_note">${value.signature_methods_note}</span>
        </p>
        
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #000; padding: 10px; text-align: left; width: 40%;">Name</th>
              <th style="border: 1px solid #000; padding: 10px; text-align: left; width: 30%;">Signed</th>
              <th style="border: 1px solid #000; padding: 10px; text-align: left; width: 30%;">Date</th>
            </tr>
          </thead>
          <tbody>
  `;

  // Generate rows for each director
  for (let i = 1; i <= Math.max(directorCount, 1); i++) {
    const directorName = formData[`director${i}Name`] || "";
    const directorDate = formData[`director${i}SignatureDate`] ? formatDate(formData[`director${i}SignatureDate`]) : "";
    
    tableHTML += `
      <tr>
        <td style="border: 1px solid #000; padding: 15px; vertical-align: top;">
          <div data-director-name="${i}" data-value-path="${currentPath}.signature_table.director_rows.director_${i}.name_field" style="min-height: 30px;">
            ${directorName || `<span style="color: #999;">Director ${i} name...</span>`}
          </div>
        </td>
        <td style="border: 1px solid #000; padding: 15px; vertical-align: top;">
          <div style="min-height: 30px; color: #666;">
            [Signature required]
          </div>
        </td>
        <td style="border: 1px solid #000; padding: 15px; vertical-align: top;">
          <div data-director-date="${i}" data-value-path="${currentPath}.signature_table.director_rows.director_${i}.date_field" style="min-height: 30px;">
            ${directorDate || `<span style="color: #999;">Date...</span>`}
          </div>
        </td>
      </tr>
    `;
  }

  // Add empty rows up to 10 total if less than 10 directors
  for (let i = Math.max(directorCount, 1) + 1; i <= 10; i++) {
    tableHTML += `
      <tr style="display: none;">
        <td style="border: 1px solid #000; padding: 15px; height: 50px;"></td>
        <td style="border: 1px solid #000; padding: 15px;"></td>
        <td style="border: 1px solid #000; padding: 15px;"></td>
      </tr>
    `;
  }

  tableHTML += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  return tableHTML;
}

function getFieldValue(fieldName, formData) {
  return formData[fieldName] || '';
}

function validateForm() {
  const requiredFields = [
    'companyName',
    'communityDescription',
    'companyActivities',
    'activityBenefit',
    'surplusUsage',
    'directorCount'
  ];

  const errors = [];
  
  requiredFields.forEach(fieldId => {
    const value = formDataStore[fieldId];
    if (!value || value.trim() === '') {
      const fieldElement = document.getElementById(fieldId);
      if (fieldElement) {
        const label = fieldElement.previousElementSibling;
        const fieldName = label ? label.textContent.replace('*', '').trim() : fieldId;
        errors.push(fieldName);
      }
    }
  });

  // Validate at least one director has a name
  const directorCount = parseInt(formDataStore.directorCount) || 0;
  let hasValidDirector = false;
  for (let i = 1; i <= directorCount; i++) {
    if (formDataStore[`director${i}Name`] && formDataStore[`director${i}Name`].trim() !== '') {
      hasValidDirector = true;
      break;
    }
  }
  
  if (directorCount > 0 && !hasValidDirector) {
    errors.push('At least one director name');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

function showValidationErrors(errors) {
  const errorDiv = document.getElementById('validation-errors') || document.createElement('div');
  errorDiv.id = 'validation-errors';
  errorDiv.style.cssText = `
    background-color: #ffebee;
    border: 1px solid #f44336;
    color: #c62828;
    padding: 15px;
    margin: 20px 0;
    border-radius: 4px;
  `;
  
  errorDiv.innerHTML = `
    <h4 style="margin: 0 0 10px 0; color: #c62828;">Please complete the following required fields:</h4>
    <ul style="margin: 0; padding-left: 20px;">
      ${errors.map(error => `<li>${error}</li>`).join('')}
    </ul>
  `;
  
  const container = document.getElementById("keyContainer");
  container.insertBefore(errorDiv, container.firstChild);
  
  // Scroll to top
  errorDiv.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearValidationErrors() {
  const errorDiv = document.getElementById('validation-errors');
  if (errorDiv) {
    errorDiv.remove();
  }
}

function showQuestionnaire() {
  const container = document.getElementById("keyContainer");
  container.innerHTML = "";

  let allQuestionsHTML = "";
  for (let stepNumber = 1; stepNumber <= 5; stepNumber++) {
    const stepData = documentQuestions[`step${stepNumber}`];
    allQuestionsHTML += `
      <div class="questionnaire-section">
        <h3>${stepData.title}</h3>
        <div class="step-content">
          ${createQuestionsHTML(stepData)}
        </div>
      </div>
    `;
  }

  container.innerHTML = allQuestionsHTML + `
    <div class="validation-section" style="margin-top: 30px; text-align: center;">
      <button id="validateFormBtn" class="btn btn-primary" style="padding: 12px 24px; font-size: 16px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Validate Form
      </button>
      <p style="margin-top: 10px; font-size: 14px; color: #666;">
        Click to check if all required fields are completed
      </p>
    </div>
  `;

  // Add event handlers
  document
    .querySelectorAll("#keyContainer input, #keyContainer select, #keyContainer textarea")
    .forEach((input) => {
      input.addEventListener("input", function () {
        formDataStore[this.id] = this.value;

        if (this.id === "directorCount") {
          handleDirectorCountChange(this);
        } else {
          // Clear validation errors when user starts typing
          if (this.value && this.value.trim() !== '') {
            clearValidationErrors();
          }
          
          updateDocumentWithFormData(formDataStore);
          updatePreview();
        }
      });
    });

  // Add validate button event listener
  document.getElementById('validateFormBtn').addEventListener('click', function() {
    const validation = validateForm();
    if (validation.isValid) {
      clearValidationErrors();
      showNotification('✅ Form validation passed! All required fields are completed.');
    } else {
      showValidationErrors(validation.errors);
    }
  });

  // Restore saved form data
  for (let step = 1; step <= 5; step++) {
    restoreStepData(step);
  }
  registerHighlightEvents();
}

function registerHighlightEvents() {
  document.querySelectorAll("#keyContainer input, #keyContainer select, #keyContainer textarea").forEach(input => {
    input.addEventListener("focus", function() {
      highlightDocumentSection(this.id);
    });

    input.addEventListener("input", function() {
      highlightDocumentSection(this.id);
    });

    input.addEventListener("blur", function() {
      setTimeout(() => {
        if (!document.activeElement || !document.activeElement.hasAttribute("data-affects-path")) {
          clearHighlights();
        }
      }, 100);
    });
  });
}

function createQuestionsHTML(stepData) {
  let html = "";

  for (const [key, data] of Object.entries(stepData)) {
    if (key === "title") continue;

    if (typeof data === "object" && !data.type) {
      html += `<div class="question-group" id="${key}-group">`;
      html += createQuestionsHTML(data);
      html += "</div>";
    } else {
      html += createQuestionField(key, data);
    }
  }
  return html;
}

function createQuestionField(key, data, sectionClass = "") {
  if (!data.question) return "";

  let visibilityAttr = "";
  if (data.showIf) {
    visibilityAttr = `data-show-if="${data.showIf}" data-min-directors="${data.minDirectors || 1}" style="display: none;"`;
  }

  const affectedPaths = documentPathMap[key] ?
      `data-affects-path="${documentPathMap[key].join(',')}"` : "";
  
  const requiredAttr = data.required ? 'required' : '';

  return `
    <div class="question-field ${sectionClass}" ${visibilityAttr}>
      <label>${data.question} ${data.required ? '<span style="color: red;">*</span>' : ''}</label>
      ${createInputElement(key, data, affectedPaths, requiredAttr)}
    </div>
  `;
}

function createInputElement(key, data, affectedPaths, requiredAttr) {
  // Special handler for director count
  if (key === "directorCount") {
    return `
      <select id="${key}" onchange="handleDirectorCountChange(this)" ${affectedPaths} ${requiredAttr}>
        <option value="">Select...</option>
        ${data.options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
      </select>
    `;
  }

  // Standard input types
  switch (data.type) {
    case "textarea":
      const rows = data.rows || 3;
      return `<textarea id="${key}" class="form-textarea" placeholder="${data.placeholder || ''}" rows="${rows}" ${affectedPaths} ${requiredAttr}></textarea>`;
    case "date":
      return `<input type="date" id="${key}" ${affectedPaths} ${requiredAttr}>`;
    case "email":
      return `<input type="email" id="${key}" placeholder="${data.placeholder || ''}" ${affectedPaths} ${requiredAttr}>`;
    case "tel":
      return `<input type="tel" id="${key}" placeholder="${data.placeholder || ''}" ${affectedPaths} ${requiredAttr}>`;
    case "select":
      return `
        <select id="${key}" ${affectedPaths} ${requiredAttr}>
          <option value="">Select...</option>
          ${data.options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
        </select>
      `;
    default:
      return `<input type="text" id="${key}" placeholder="${data.placeholder || ''}" ${affectedPaths} ${requiredAttr}>`;
  }
}

function handleDirectorCountChange(selectElement) {
  const selectedCount = parseInt(selectElement.value) || 0;
  formDataStore[selectElement.id] = selectElement.value;

  // Show/hide director fields based on count using proper selectors
  document.querySelectorAll('[data-show-if="directorCount"]').forEach(field => {
    const minDirectors = parseInt(field.getAttribute('data-min-directors')) || 1;
    const shouldShow = selectedCount >= minDirectors;
    field.style.display = shouldShow ? "block" : "none";
  });

  updateDocumentWithFormData(formDataStore);
  updatePreview();
  highlightDocumentSection(selectElement.id);

  // Focus first visible director field
  setTimeout(() => {
    const firstVisibleField = document.querySelector('[data-show-if="directorCount"][style*="block"] input');
    if (firstVisibleField && !firstVisibleField.value) {
      firstVisibleField.focus();
    }
  }, 200);
}

function restoreStepData(stepNumber) {
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && formDataStore[input.id]) {
      input.value = formDataStore[input.id];

      if (input.tagName === "SELECT") {
        if (input.id === "directorCount") {
          handleDirectorCountChange(input);
        }
      }
    }
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });
}

/**
 * Enhanced form data to document mapping for CIC 36 form
 */
function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };
  const documentTitle = Object.keys(window.currentDocument)[0] || "CIC 36 Form";

  // Company name (appears in multiple places)
  if (formData.companyName) {
    const companyNameKey1 = `${documentTitle}.COMPANY_NAME_HEADER_SECTION.header_table.company_name_field`;
    const companyNameKey2 = `${documentTitle}.COMPANY_NAME_REPEAT_SECTION.company_name_field`;
    const companyNameKey3 = `${documentTitle}.COMPANY_NAME_REPEAT_SECTION_2.company_name_field`;
    
    updatedFlatDoc[companyNameKey1] = formData.companyName;
    updatedFlatDoc[companyNameKey2] = formData.companyName;
    updatedFlatDoc[companyNameKey3] = formData.companyName;
  }

  // Section A - Community description
  if (formData.communityDescription) {
    const communityKey = `${documentTitle}.SECTION_A_BENEFICIARIES.community_description_field.placeholder`;
    updatedFlatDoc[communityKey] = formData.communityDescription;
  }

  // Section B - Activities and benefit
  if (formData.companyActivities) {
    const activitiesKey = `${documentTitle}.SECTION_B_ACTIVITIES.activities_subsection.activities_text_area.placeholder`;
    updatedFlatDoc[activitiesKey] = formData.companyActivities;
  }

  if (formData.activityBenefit) {
    const benefitKey = `${documentTitle}.SECTION_B_ACTIVITIES.activities_subsection.benefit_text_area.placeholder`;
    updatedFlatDoc[benefitKey] = formData.activityBenefit;
  }

  if (formData.surplusUsage) {
    const surplusKey = `${documentTitle}.SECTION_B_ACTIVITIES.surplus_usage_section.surplus_text_area.placeholder`;
    updatedFlatDoc[surplusKey] = formData.surplusUsage;
  }

  // Director information
  for (let i = 1; i <= 10; i++) {
    const directorName = formData[`director${i}Name`];
    const directorDate = formData[`director${i}SignatureDate`];

    if (directorName) {
      const nameKey = `${documentTitle}.SECTION_D_SIGNATURES.signature_table.director_rows.director_${i}.name_field`;
      updatedFlatDoc[nameKey] = directorName;
    }

    if (directorDate) {
      const dateKey = `${documentTitle}.SECTION_D_SIGNATURES.signature_table.director_rows.director_${i}.date_field`;
      updatedFlatDoc[dateKey] = formatDate(directorDate);
    }
  }

  // Contact information
  if (formData.contactName) {
    const contactNameKey = `${documentTitle}.CONTACT_INFORMATION.contact_table.name_address_section.name_field`;
    updatedFlatDoc[contactNameKey] = formData.contactName;
  }

  if (formData.contactAddress) {
    const contactAddressKey = `${documentTitle}.CONTACT_INFORMATION.contact_table.name_address_section.address_field.placeholder`;
    updatedFlatDoc[contactAddressKey] = formData.contactAddress;
  }

  if (formData.contactEmail) {
    const emailKey = `${documentTitle}.CONTACT_INFORMATION.contact_table.communication_details.email_field`;
    updatedFlatDoc[emailKey] = formData.contactEmail;
  }

  if (formData.contactTelephone) {
    const telephoneKey = `${documentTitle}.CONTACT_INFORMATION.contact_table.communication_details.telephone_field`;
    updatedFlatDoc[telephoneKey] = formData.contactTelephone;
  }

  if (formData.contactDXNumber) {
    const dxNumberKey = `${documentTitle}.CONTACT_INFORMATION.contact_table.communication_details.dx_number_field`;
    updatedFlatDoc[dxNumberKey] = formData.contactDXNumber;
  }

  if (formData.contactDXExchange) {
    const dxExchangeKey = `${documentTitle}.CONTACT_INFORMATION.contact_table.communication_details.dx_exchange_field`;
    updatedFlatDoc[dxExchangeKey] = formData.contactDXExchange;
  }

  return updatedFlatDoc;
}

function updateDocumentWithFormData(formData) {
  const templateDoc = getDocumentTemplate();
  const flatTemplate = flattenObject(templateDoc);
  const updatedFlatDoc = applyFormDataToFlatDocument(flatTemplate, formData);
  const updatedDoc = unflattenObject(updatedFlatDoc);
  window.currentDocument = updatedDoc;
  console.log("Updated document with form data:", window.currentDocument);
}

// Save selection for inserted content
let savedRange = null;

function saveSelection() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) savedRange = sel.getRangeAt(0);
}

function updatePreview() {
  const previewElem = document.getElementById("documentPreview");
  if (!previewElem) {
    console.error("Preview element not found");
    return;
  }

  try {
    const html = convertToHtml(window.currentDocument);
    previewElem.innerHTML = html;
  } catch (error) {
    console.error("Error updating preview:", error);
    previewElem.innerHTML = '<div class="error">Error loading document preview</div>';
  }
}

function splitPath(path) {
  return path.split(".").map(part => part.trim());
}

function downloadWordDocx() {
  const content = document.getElementById("documentPreview").innerHTML;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>CIC 36 - Declarations on Formation of a Community Interest Company</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.3;
          color: #000;
          margin: 0.75in;
        }
        .form-header h1 {
          font-size: 16pt;
          font-weight: bold;
          text-align: center;
        }
        .form-header h2 {
          font-size: 14pt;
          text-align: center;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 10pt 0;
        }
        td, th {
          border: 1px solid #000;
          padding: 8pt;
          vertical-align: top;
        }
        .section-title {
          background-color: #f0f0f0;
          font-weight: bold;
          padding: 10pt;
        }
        sup {
          font-size: 8pt;
        }
        .warning {
          color: red;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;

  const converted = htmlDocx.asBlob(html);
  const url = URL.createObjectURL(converted);
  const link = document.createElement("a");
  link.href = url;
  link.download = "CIC36_Declarations_Form.docx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function toggleEditMode() {
  const previewElem = document.getElementById("documentPreview");
  const toggle = document.getElementById("editModeToggle");

  if (!previewElem) return;

  if (toggle && toggle.checked) {
    previewElem.contentEditable = true;
    previewElem.classList.add("editable");
    showNotification("Edit mode enabled. You can now directly edit the document text.");
  } else {
    previewElem.contentEditable = false;
    previewElem.classList.remove("editable");
    showNotification("Edit mode disabled. Changes made in edit mode remain.");
  }
}

function showNotification(message) {
  const notification = document.createElement("div");
  notification.className = "notification";
  notification.textContent = message;
  notification.style.position = "fixed";
  notification.style.bottom = "20px";
  notification.style.right = "20px";
  notification.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  notification.style.color = "white";
  notification.style.padding = "10px 15px";
  notification.style.borderRadius = "4px";
  notification.style.zIndex = "1000";

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transition = "opacity 0.5s";
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 500);
  }, 3000);
}

// Expose functions to global scope
window.showQuestionnaire = showQuestionnaire;
window.handleDirectorCountChange = handleDirectorCountChange;
window.highlightDocumentSection = highlightDocumentSection;
window.clearHighlights = clearHighlights;
window.closeEditDialog = closeEditDialog;
window.toggleEditMode = toggleEditMode;
window.downloadWordDocx = downloadWordDocx;