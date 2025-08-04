// Document order configuration
const sectionOrder = [
  "DOCUMENT_HEADER",
  "TITLE_SECTION",
  "REPEATED_HEADER",
  "MAIN_CONTENT",
  "SUBSCRIBER_SECTION",
  "DATE_SECTION",
  "FOOTNOTES"
];

// Smart label detection patterns
const INTERNAL_FIELDS_TO_HIDE = ["content", "act_reference", "company_type", "document_title", "of_text", "preamble", "column_headers", "subscriber_entry_placeholders", "date_label", "company_name_placeholder", "company_designation_options"];
const NUMBERED_PATTERN = /^\d+$/; // Show "1.", "2.", etc.
const CLAUSE_PATTERN = /^\d+\.\d+$/; // Show "1.1:", "2.1:", etc.
const LETTER_PATTERN = /^[a-z]$/; // Show "(a)", "(b)", etc.
const ROMAN_PATTERN = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/; // Roman numerals

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

// Enhanced questionnaire for Memorandum of Association
const documentQuestions = {
  step1: {
    title: "Company Information",
    companyName: {
      question: "Enter the full company name",
      type: "text",
      placeholder: "e.g., Green Energy Solutions Limited"
    },
    companyDesignation: {
      question: "Select company designation",
      type: "select",
      options: ["Community Interest Company", "C.I.C."],
    },
  },
  step2: {
    title: "Subscriber Information",
    subscriberCount: {
      question: "How many subscribers will there be?",
      type: "select",
      options: ["1", "2", "3", "4", "5"],
    },
    subscriber1Name: {
      question: "Enter name of first subscriber",
      type: "text",
      placeholder: "Full legal name",
      showIf: "subscriberCount"
    },
    subscriber1Authentication: {
      question: "Enter authentication details for first subscriber",
      type: "textarea", 
      placeholder: "Signature, witness details, etc.",
      showIf: "subscriberCount"
    },
    subscriber2Name: {
      question: "Enter name of second subscriber",
      type: "text",
      placeholder: "Full legal name",
      showIf: "subscriberCount",
      minSubscribers: 2
    },
    subscriber2Authentication: {
      question: "Enter authentication details for second subscriber",
      type: "textarea",
      placeholder: "Signature, witness details, etc.",
      showIf: "subscriberCount",
      minSubscribers: 2
    },
    subscriber3Name: {
      question: "Enter name of third subscriber",
      type: "text",
      placeholder: "Full legal name",
      showIf: "subscriberCount",
      minSubscribers: 3
    },
    subscriber3Authentication: {
      question: "Enter authentication details for third subscriber",
      type: "textarea",
      placeholder: "Signature, witness details, etc.",
      showIf: "subscriberCount",
      minSubscribers: 3
    },
    subscriber4Name: {
      question: "Enter name of fourth subscriber",
      type: "text",
      placeholder: "Full legal name", 
      showIf: "subscriberCount",
      minSubscribers: 4
    },
    subscriber4Authentication: {
      question: "Enter authentication details for fourth subscriber",
      type: "textarea",
      placeholder: "Signature, witness details, etc.",
      showIf: "subscriberCount",
      minSubscribers: 4
    },
    subscriber5Name: {
      question: "Enter name of fifth subscriber",
      type: "text",
      placeholder: "Full legal name",
      showIf: "subscriberCount",
      minSubscribers: 5
    },
    subscriber5Authentication: {
      question: "Enter authentication details for fifth subscriber", 
      type: "textarea",
      placeholder: "Signature, witness details, etc.",
      showIf: "subscriberCount",
      minSubscribers: 5
    },
  },
  step3: {
    title: "Document Date",
    documentDate: {
      question: "Enter the date of the memorandum",
      type: "date",
    },
  },
};

// Document path mapping for memorandum fields
const documentPathMap = {
  // Company information
  "companyName": [
    "Memorandum of Association.TITLE_SECTION.company_name_placeholder",
    "Memorandum of Association.REPEATED_HEADER.company_name_placeholder"
  ],
  "companyDesignation": [
    "Memorandum of Association.TITLE_SECTION.company_designation_options",
    "Memorandum of Association.REPEATED_HEADER.company_designation_options"
  ],
  
  // Subscriber information
  "subscriberCount": ["Memorandum of Association.SUBSCRIBER_SECTION"],
  "subscriber1Name": ["Memorandum of Association.SUBSCRIBER_SECTION"],
  "subscriber1Authentication": ["Memorandum of Association.SUBSCRIBER_SECTION"],
  "subscriber2Name": ["Memorandum of Association.SUBSCRIBER_SECTION"],
  "subscriber2Authentication": ["Memorandum of Association.SUBSCRIBER_SECTION"],
  "subscriber3Name": ["Memorandum of Association.SUBSCRIBER_SECTION"],
  "subscriber3Authentication": ["Memorandum of Association.SUBSCRIBER_SECTION"],
  "subscriber4Name": ["Memorandum of Association.SUBSCRIBER_SECTION"],
  "subscriber4Authentication": ["Memorandum of Association.SUBSCRIBER_SECTION"],
  "subscriber5Name": ["Memorandum of Association.SUBSCRIBER_SECTION"],
  "subscriber5Authentication": ["Memorandum of Association.SUBSCRIBER_SECTION"],
  
  // Document date
  "documentDate": ["Memorandum of Association.DATE_SECTION.date_placeholder"],
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
    window.currentDocument = { "Memorandum of Association": {} };
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
 * Enhanced document to HTML conversion for legal memorandum formatting
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
    const marginLeft = level * 20;

    if (key === "DOCUMENT_HEADER") {
      // Document header with act reference and company type
      html.push(`
        <div class="document-header" data-path="${currentPath}" style="text-align: center; margin-bottom: 30px; margin-top: 30vh">
          <div style="margin-bottom: 10px;">
            <span data-value-path="${currentPath}.act_reference">${value.act_reference}</span>
          </div>
          <div style="margin-bottom: 20px;">
            <span data-value-path="${currentPath}.company_type">${value.company_type}</span>
            ${value.footnote_reference ? `<sup>${value.footnote_reference}</sup>` : ''}
          </div>
          <hr style="width: 80%; margin: 20px auto;">
        </div>
      `);
    } else if (key === "TITLE_SECTION") {
      // Title section with company name placeholder
      html.push(`
        <div class="title-section" data-path="${currentPath}" style="text-align: center; margin-bottom: 40px;">
          <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
            <span data-value-path="${currentPath}.content">${value.content}</span>
          </div>
          <div style="margin-bottom: 10px;">
            <span data-value-path="${currentPath}.company_name_placeholder">${value.company_name_placeholder}</span>
          </div>
          <div style="margin-bottom: 10px;">
            <span data-value-path="${currentPath}.company_designation_options.option_1">${value.company_designation_options.option_1}</span>/<span data-value-path="${currentPath}.company_designation_options.option_2">${value.company_designation_options.option_2}</span>
            <em> ${value.company_designation_options.instruction}</em>
            ${value.company_designation_options.footnote_reference ? `<sup>${value.company_designation_options.footnote_reference}</sup>` : ''}
          </div>
          <hr style="width: 90%; margin: 20px auto; margin-bottom: 40vh">
        </div>
      `);
    } else if (key === "REPEATED_HEADER") {
      // Repeated header section
      html.push(`
        <div class="repeated-header" data-path="${currentPath}" style="text-align: center; margin-bottom: 30px;">
          <div style="font-weight: bold; margin-bottom: 5px;">
            <span data-value-path="${currentPath}.act_reference">${value.act_reference}</span>
          </div>
          <div style="margin-bottom: 5px;">
            <span data-value-path="${currentPath}.company_type">${value.company_type}</span>
          </div>
          <div style="margin-bottom: 5px;">
            <span data-value-path="${currentPath}.document_title">${value.document_title}</span>
            ${value.document_title_footnote ? `<sup>${value.document_title_footnote}</sup>` : ''}
          </div>
          <div style="margin-bottom: 10px;">
            <span data-value-path="${currentPath}.of_text">${value.of_text}</span>
          </div>
          <div>
            <span data-value-path="${currentPath}.company_name_placeholder">${value.company_name_placeholder}</span>
          </div>
          <div style="margin-bottom: 10px;">
            <span data-value-path="${currentPath}.company_designation_options.option_1">${value.company_designation_options.option_1}</span>/<span data-value-path="${currentPath}.company_designation_options.option_2">${value.company_designation_options.option_2}</span>
            <em> ${value.company_designation_options.instruction}</em>
          </div>
        </div>
      `);
    } else if (key === "MAIN_CONTENT") {
      // Main content paragraph
      html.push(`
        <div class="main-content" data-path="${currentPath}" style="margin: 30px 0; text-align: justify; line-height: 1.6;">
          <span data-value-path="${currentPath}.content">${value.content}</span>
        </div>
      `);
    } else if (key === "SUBSCRIBER_SECTION") {
      // Dynamic subscriber table section
      html.push(generateSubscriberTable(currentPath, value, formDataStore));
    } else if (key === "DATE_SECTION") {
      // Date section
      html.push(`
        <div class="date-section" data-path="${currentPath}" style="margin: 40px 0;">
          <span data-value-path="${currentPath}.date_label">${value.date_label}</span>
          <span data-value-path="${currentPath}.date_placeholder" style="margin-left: 10px;">${value.date_placeholder}</span>
        </div>
      `);
    } else if (key === "FOOTNOTES") {
      // Footnotes section
      html.push(`
        <div class="footnotes-section" data-path="${currentPath}" style="margin-top: 60px; border-top: 1px solid #ccc; padding-top: 20px;">
          <hr style="width: 30%; margin-left: 0;">
      `);
      
      Object.entries(value).forEach(([footnoteKey, footnoteValue]) => {
        html.push(`
          <div class="footnote" style="margin-bottom: 15px; font-size: 11px; line-height: 1.4;">
            <sup>${footnoteKey}</sup> 
            <span data-value-path="${currentPath}.${footnoteKey}.content">${footnoteValue.content}</span>
          </div>
        `);
      });
      
      html.push(`</div>`);
    }
  }
}

function generateSubscriberTable(currentPath, value, formData) {
  const subscriberCount = parseInt(formData.subscriberCount) || 1;
  
  let tableHTML = `
    <div class="subscriber-section" data-path="${currentPath}" style="margin: 40px 0;">
      <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
        <tr style="border-bottom: 2px solid #000;">
          <td style="width: 50%; padding: 15px; border-right: 1px solid #000; font-style: italic; text-align: center;">
            <span data-value-path="${currentPath}.column_headers.name_column">${value.column_headers.name_column}</span>
            ${value.column_headers.name_column_footnote ? `<sup>${value.column_headers.name_column_footnote}</sup>` : ''}
          </td>
          <td style="width: 50%; padding: 15px; font-style: italic; text-align: center;">
            <span data-value-path="${currentPath}.column_headers.authentication_column">${value.column_headers.authentication_column}</span>
          </td>
        </tr>
  `;

  // Generate rows for each subscriber
  for (let i = 1; i <= subscriberCount; i++) {
    const subscriberName = formData[`subscriber${i}Name`] || "";
    const subscriberAuth = formData[`subscriber${i}Authentication`] || "";
    
    tableHTML += `
      <tr>
        <td style="padding: 20px; border-right: 1px solid #000; vertical-align: top; border-bottom: ${i < subscriberCount ? '1px solid #000' : 'none'};">
          <div data-subscriber-name="${i}" style="min-height: 40px; line-height: 1.4;">
            ${subscriberName || `<span style="color: #999;">Subscriber ${i} name...</span>`}
          </div>
        </td>
        <td style="padding: 20px; vertical-align: top; border-bottom: ${i < subscriberCount ? '1px solid #000' : 'none'};">
          <div data-subscriber-auth="${i}" style="min-height: 40px; line-height: 1.4;">
            ${subscriberAuth || `<span style="color: #999;">Authentication details...</span>`}
          </div>
        </td>
      </tr>
    `;
  }

  tableHTML += `
      </table>
    </div>
  `;

  return tableHTML;
}

function showQuestionnaire() {
  const container = document.getElementById("keyContainer");
  container.innerHTML = "";

  let allQuestionsHTML = "";
  for (let stepNumber = 1; stepNumber <= 3; stepNumber++) {
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

  container.innerHTML = allQuestionsHTML;

  // Add event handlers
  document
    .querySelectorAll("#keyContainer input, #keyContainer select, #keyContainer textarea")
    .forEach((input) => {
      input.addEventListener("input", function () {
        formDataStore[this.id] = this.value;

        if (this.id === "subscriberCount") {
          handleSubscriberCountChange(this);
        } else {
          updateDocumentWithFormData(formDataStore);
          updatePreview();
        }
      });
    });

  // Restore saved form data
  for (let step = 1; step <= 3; step++) {
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
    visibilityAttr = `data-show-if="${data.showIf}" data-min-subscribers="${data.minSubscribers || 1}" style="display: none;"`;
  }

  const affectedPaths = documentPathMap[key] ?
      `data-affects-path="${documentPathMap[key].join(',')}"` : "";

  return `
    <div class="question-field ${sectionClass}" ${visibilityAttr}>
      <label>${data.question}</label>
      ${createInputElement(key, data, affectedPaths)}
    </div>
  `;
}

function createInputElement(key, data, affectedPaths) {
  // Special handler for subscriber count
  if (key === "subscriberCount") {
    return `
      <select id="${key}" onchange="handleSubscriberCountChange(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
      </select>
    `;
  }

  // Standard input types
  switch (data.type) {
    case "textarea":
      return `<textarea id="${key}" class="form-textarea" placeholder="${data.placeholder || ''}" ${affectedPaths}></textarea>`;
    case "date":
      return `<input type="date" id="${key}" ${affectedPaths}>`;
    case "select":
      return `
        <select id="${key}" ${affectedPaths}>
          <option value="">Select...</option>
          ${data.options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
        </select>
      `;
    default:
      return `<input type="text" id="${key}" placeholder="${data.placeholder || ''}" ${affectedPaths}>`;
  }
}

function handleSubscriberCountChange(selectElement) {
  const selectedCount = parseInt(selectElement.value) || 0;
  formDataStore[selectElement.id] = selectElement.value;

  // Show/hide subscriber fields based on count using proper selectors
  document.querySelectorAll('[data-show-if="subscriberCount"]').forEach(field => {
    const minSubscribers = parseInt(field.getAttribute('data-min-subscribers')) || 1;
    const shouldShow = selectedCount >= minSubscribers;
    field.style.display = shouldShow ? "block" : "none";
  });

  updateDocumentWithFormData(formDataStore);
  updatePreview();
  highlightDocumentSection(selectElement.id);

  // Focus first visible subscriber field
  setTimeout(() => {
    const firstVisibleField = document.querySelector('[data-show-if="subscriberCount"][style*="block"] input, [data-show-if="subscriberCount"][style*="block"] textarea');
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
        if (input.id === "subscriberCount") {
          handleSubscriberCountChange(input);
        }
      }
    }
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  const year = date.getFullYear();
  
  // Add ordinal suffix to day
  const ordinal = (day) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };
  
  return `${day}${ordinal(day)} day of ${month}, ${year}`;
}

/**
 * Enhanced form data to document mapping for memorandum
 */
function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };
  const documentTitle = Object.keys(window.currentDocument)[0] || "Memorandum of Association";

  // Company name placeholders
  if (formData.companyName) {
    const titleCompanyKey = `${documentTitle}.TITLE_SECTION.company_name_placeholder`;
    const repeatedCompanyKey = `${documentTitle}.REPEATED_HEADER.company_name_placeholder`;
    
    updatedFlatDoc[titleCompanyKey] = formData.companyName;
    updatedFlatDoc[repeatedCompanyKey] = formData.companyName;
  }

  // Company designation - update both sections
  if (formData.companyDesignation) {
    const titleDesignationKey1 = `${documentTitle}.TITLE_SECTION.company_designation_options.option_1`;
    const titleDesignationKey2 = `${documentTitle}.TITLE_SECTION.company_designation_options.option_2`;
    const repeatedDesignationKey1 = `${documentTitle}.REPEATED_HEADER.company_designation_options.option_1`;
    const repeatedDesignationKey2 = `${documentTitle}.REPEATED_HEADER.company_designation_options.option_2`;
    
    // Set selected option as primary, other as secondary
    if (formData.companyDesignation === "Community Interest Company") {
      updatedFlatDoc[titleDesignationKey1] = "**Community Interest Company**";
      updatedFlatDoc[titleDesignationKey2] = "~~C.I.C.~~";
      updatedFlatDoc[repeatedDesignationKey1] = "**Community Interest Company**"; 
      updatedFlatDoc[repeatedDesignationKey2] = "~~C.I.C.~~";
    } else {
      updatedFlatDoc[titleDesignationKey1] = "~~Community Interest Company~~";
      updatedFlatDoc[titleDesignationKey2] = "**C.I.C.**";
      updatedFlatDoc[repeatedDesignationKey1] = "~~Community Interest Company~~";
      updatedFlatDoc[repeatedDesignationKey2] = "**C.I.C.**";
    }
  }

  // Document date
  if (formData.documentDate) {
    const dateKey = `${documentTitle}.DATE_SECTION.date_placeholder`;
    updatedFlatDoc[dateKey] = formatDate(formData.documentDate);
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
      <title>Memorandum of Association</title>
      <style>
        body {
          font-family: "Times New Roman", serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #000;
          margin: 1in;
        }
        .document-header, .title-section, .repeated-header {
          text-align: center;
          margin-bottom: 20pt;
        }
        .main-content {
          text-align: justify;
          margin: 20pt 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20pt 0;
        }
        td {
          border: 1px solid #000;
          padding: 15pt;
          vertical-align: top;
        }
        .footnotes-section {
          margin-top: 40pt;
          border-top: 1pt solid #000;
          padding-top: 20pt;
          font-size: 10pt;
        }
        sup {
          font-size: 8pt;
        }
        del {
          text-decoration: line-through;
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
  link.download = "Memorandum_of_Association.docx";
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
window.handleSubscriberCountChange = handleSubscriberCountChange;
window.highlightDocumentSection = highlightDocumentSection;
window.clearHighlights = clearHighlights;
window.closeEditDialog = closeEditDialog;
window.toggleEditMode = toggleEditMode;
window.downloadWordDocx = downloadWordDocx;