// Memorandum of Association document order configuration
const sectionOrder = [
  "MAIN_HEADING",
  "DOCUMENT_TITLE",
  "PREAMBLE", 
  "SUBSCRIBERS"
];

// Smart label detection patterns
const INTERNAL_FIELDS_TO_HIDE = ["content", "table_header", "subscribers"];
const NUMBERED_PATTERN = /^\d+$/;

// Document template storage
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

// Enhanced questionnaire with dynamic subscriber management
const documentQuestions = {
  step1: {
    title: "Company Information",
    companyName: {
      question: "Enter the company name",
      type: "text",
      placeholder: "e.g., ABC Limited"
    }
  },
  step2: {
    title: "Subscriber Information",
    numberOfSubscribers: {
      question: "How many subscribers will there be?",
      type: "select",
      options: ["2", "3", "4", "5", "6", "7", "8", "9", "10"]
    }
  }
};

// Dynamic document path mapping - will be populated based on subscriber count
let documentPathMap = {
  "companyName": ["Memorandum of Association.DOCUMENT_TITLE.content"]
};

/**
 * Generate dynamic subscriber questions based on selected count
 */
function generateSubscriberQuestions(count) {
  const subscriberQuestions = {};
  
  for (let i = 1; i <= count; i++) {
    subscriberQuestions[`subscriber${i}Name`] = {
      question: `Enter name of subscriber ${i}`,
      type: "text",
      placeholder: `Full legal name of subscriber ${i}`
    };
    
    subscriberQuestions[`subscriber${i}Authentication`] = {
      question: `Enter authentication details for subscriber ${i}`,
      type: "textarea",
      placeholder: `Signature, witness details, date, etc. for subscriber ${i}`
    };
    
    // Add to document path map
    documentPathMap[`subscriber${i}Name`] = [`Memorandum of Association.SUBSCRIBERS.subscribers.${i}.name`];
    documentPathMap[`subscriber${i}Authentication`] = [`Memorandum of Association.SUBSCRIBERS.subscribers.${i}.authentication`];
  }
  
  return subscriberQuestions;
}

/**
 * Enhanced highlighting with better section detection
 */
function highlightDocumentSection(fieldId) {
  clearHighlights();

  const paths = documentPathMap[fieldId];
  if (!paths || paths.length === 0) return;

  const previewElem = document.getElementById("documentPreview");
  paths.forEach(path => {
    let elements = previewElem.querySelectorAll(`[data-value-path="${path}"]`);

    if (elements.length === 0) {
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
  console.log("Memorandum document initialization started");
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

    console.log("Memorandum document initialization completed");
  } catch (error) {
    console.error("Error during initialization:", error);
  }
});

/**
 * Enhanced document to HTML conversion with proper table formatting
 */
function convertToHtml(document) {
  let html = [];
  const documentTitle = Object.keys(document)[0];

  if (documentTitle) {
    // Center-aligned document title (implied from company name)
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
    const isMainSection = sectionOrder.includes(key);

    if (key === "MAIN_HEADING") {
      // Main heading
      html.push(
        `<div class="document-main-heading" style="text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 10px;">
          <span data-value-path="${currentPath}.content">${value.content}</span>
        </div>`
      );
    } else if (key === "DOCUMENT_TITLE") {
      // Document title
      html.push(
        `<div class="document-title" style="text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 20px;">
          <span data-value-path="${currentPath}.content">${value.content}</span>
        </div>`
      );
    } else if (key === "PREAMBLE") {
      // Preamble text
      html.push(
        `<div class="document-line document-content" data-path="${currentPath}" style="margin-bottom: 20px;">
          <span data-value-path="${currentPath}.content">${value.content}</span>
        </div>`
      );
    } else if (key === "SUBSCRIBERS") {
      // Render subscribers table
      html.push(
        `<div class="document-line subscribers-section" data-path="${currentPath}" style="margin-top: 20px;">
          <table style="width: 100%; border-collapse: collapse; border: 2px solid #333;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="border: 1px solid #333; padding: 12px; text-align: left; font-style: italic;">
                  ${value.table_header.name_column}
                </th>
                <th style="border: 1px solid #333; padding: 12px; text-align: left; font-style: italic;">
                  ${value.table_header.authentication_column}
                </th>
              </tr>
            </thead>
            <tbody>
              ${renderSubscriberRows(value.subscribers, currentPath)}
            </tbody>
          </table>
        </div>`
      );
    }
  }

  function renderSubscriberRows(subscribers, basePath) {
    let rows = "";
    if (subscribers) {
      Object.keys(subscribers).sort((a, b) => parseInt(a) - parseInt(b)).forEach(subscriberKey => {
        const subscriber = subscribers[subscriberKey];
        rows += `
          <tr>
            <td style="border: 1px solid #333; padding: 12px; vertical-align: top;">
              <span data-value-path="${basePath}.subscribers.${subscriberKey}.name">
                ${subscriber.name || '*[Name of subscriber ' + subscriberKey + ']*'}
              </span>
            </td>
            <td style="border: 1px solid #333; padding: 12px; vertical-align: top;">
              <span data-value-path="${basePath}.subscribers.${subscriberKey}.authentication">
                ${subscriber.authentication || '*[Authentication of subscriber ' + subscriberKey + ']*'}
              </span>
            </td>
          </tr>
        `;
      });
    }
    return rows;
  }
}

function showQuestionnaire() {
  const container = document.getElementById("keyContainer");
  container.innerHTML = "";

  let allQuestionsHTML = "";
  
  // Step 1: Company Information
  const step1Data = documentQuestions.step1;
  allQuestionsHTML += `
    <div class="questionnaire-section">
      <h3>${step1Data.title}</h3>
      <div class="step-content">
        ${createQuestionsHTML(step1Data)}
      </div>
    </div>
  `;

  // Step 2: Number of Subscribers
  const step2Data = documentQuestions.step2;
  allQuestionsHTML += `
    <div class="questionnaire-section">
      <h3>${step2Data.title}</h3>
      <div class="step-content">
        ${createQuestionsHTML(step2Data)}
      </div>
    </div>
  `;

  // Step 3: Dynamic Subscriber Details (initially hidden)
  allQuestionsHTML += `
    <div class="questionnaire-section" id="subscriber-details-section" style="display: none;">
      <h3>Subscriber Details</h3>
      <div class="step-content" id="subscriber-details-content">
        <!-- Dynamic subscriber fields will be added here -->
      </div>
    </div>
  `;

  container.innerHTML = allQuestionsHTML;

  // Add event handlers
  document.querySelectorAll("#keyContainer input, #keyContainer select, #keyContainer textarea").forEach((input) => {
    input.addEventListener("input", function () {
      formDataStore[this.id] = this.value;

      if (this.id === "numberOfSubscribers") {
        handleSubscriberCountChange(this);
      } else {
        updateDocumentWithFormData(formDataStore);
        updatePreview();
      }
    });
  });

  // Restore saved form data
  restoreFormData();
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
    html += createQuestionField(key, data);
  }
  return html;
}

function createQuestionField(key, data, sectionClass = "") {
  if (!data.question) return "";

  const affectedPaths = documentPathMap[key] ? 
    `data-affects-path="${documentPathMap[key].join(',')}"` : "";

  switch (data.type) {
    case "textarea":
      return `
        <div class="question-field ${sectionClass}">
          <label>${data.question}</label>
          <textarea id="${key}" class="form-textarea" placeholder="${data.placeholder || ''}" ${affectedPaths}></textarea>
        </div>
      `;
    case "select":
      return `
        <div class="question-field ${sectionClass}">
          <label>${data.question}</label>
          <select id="${key}" ${affectedPaths}>
            <option value="">Select...</option>
            ${data.options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
          </select>
        </div>
      `;
    default:
      return `
        <div class="question-field ${sectionClass}">
          <label>${data.question}</label>
          <input type="text" id="${key}" placeholder="${data.placeholder || ''}" ${affectedPaths}>
        </div>
      `;
  }
}

function handleSubscriberCountChange(selectElement) {
  const count = parseInt(selectElement.value);
  
  if (!count) {
    document.getElementById("subscriber-details-section").style.display = "none";
    return;
  }

  // Clear existing subscriber data from form store
  Object.keys(formDataStore).forEach(key => {
    if (key.startsWith('subscriber') && key.match(/\d/)) {
      delete formDataStore[key];
    }
  });

  // Generate subscriber questions
  const subscriberQuestions = generateSubscriberQuestions(count);
  
  // Create HTML for subscriber fields
  let subscriberHTML = "";
  for (let i = 1; i <= count; i++) {
    subscriberHTML += `
      <div class="subscriber-group" style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 5px;">
        <h4>Subscriber ${i}</h4>
        ${createQuestionField(`subscriber${i}Name`, subscriberQuestions[`subscriber${i}Name`])}
        ${createQuestionField(`subscriber${i}Authentication`, subscriberQuestions[`subscriber${i}Authentication`])}
      </div>
    `;
  }

  // Update the subscriber details section
  document.getElementById("subscriber-details-content").innerHTML = subscriberHTML;
  document.getElementById("subscriber-details-section").style.display = "block";

  // Add event listeners to new fields
  document.querySelectorAll("#subscriber-details-content input, #subscriber-details-content textarea").forEach((input) => {
    input.addEventListener("input", function () {
      formDataStore[this.id] = this.value;
      updateDocumentWithFormData(formDataStore);
      updatePreview();
    });

    // Add highlighting events
    input.addEventListener("focus", function() {
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

  // Update document structure for new subscriber count
  updateDocumentStructureForSubscribers(count);
  updateDocumentWithFormData(formDataStore);
  updatePreview();
}

function updateDocumentStructureForSubscribers(count) {
  const documentTitle = Object.keys(window.currentDocument)[0] || "Memorandum of Association";
  
  // Ensure subscribers section exists
  if (!window.currentDocument[documentTitle].SUBSCRIBERS) {
    window.currentDocument[documentTitle].SUBSCRIBERS = {
      table_header: {
        name_column: "Name of each subscriber",
        authentication_column: "Authentication by each subscriber"
      },
      subscribers: {}
    };
  }

  // Clear existing subscribers
  window.currentDocument[documentTitle].SUBSCRIBERS.subscribers = {};

  // Add new subscribers
  for (let i = 1; i <= count; i++) {
    window.currentDocument[documentTitle].SUBSCRIBERS.subscribers[i.toString()] = {
      name: `*[Name of subscriber ${i}]*`,
      authentication: `*[Authentication of subscriber ${i}]*`
    };
  }
}

function restoreFormData() {
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && formDataStore[input.id]) {
      input.value = formDataStore[input.id];

      if (input.id === "numberOfSubscribers") {
        handleSubscriberCountChange(input);
      }
    }
  });
}

/**
 * Enhanced form data to document mapping
 */
function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };
  const documentTitle = Object.keys(window.currentDocument)[0] || "Memorandum of Association";

  // Company name
  if (formData.companyName) {
    const companyNameKey = `${documentTitle}.DOCUMENT_TITLE.content`;
    updatedFlatDoc[companyNameKey] = `Memorandum of association of ${formData.companyName}`;
  }

  // Subscriber information
  Object.keys(formData).forEach(key => {
    if (key.startsWith('subscriber') && key.includes('Name')) {
      const subscriberNum = key.match(/\d+/)[0];
      const subscriberNameKey = `${documentTitle}.SUBSCRIBERS.subscribers.${subscriberNum}.name`;
      updatedFlatDoc[subscriberNameKey] = formData[key];
    } else if (key.startsWith('subscriber') && key.includes('Authentication')) {
      const subscriberNum = key.match(/\d+/)[0];
      const subscriberAuthKey = `${documentTitle}.SUBSCRIBERS.subscribers.${subscriberNum}.authentication`;
      updatedFlatDoc[subscriberAuthKey] = formData[key];
    }
  });

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
          font-family: Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #333;
          margin: 1in;
        }
        .document-title {
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 20pt;
        }
        .document-content {
          margin-bottom: 15pt;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20pt;
        }
        th, td {
          border: 1px solid #333;
          padding: 12pt;
          vertical-align: top;
          text-align: left;
        }
        th {
          background-color: #f5f5f5;
          font-style: italic;
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