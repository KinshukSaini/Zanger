const sectionOrder = [
  "1. Introduction",
  "2. Definitions",
  "3. Term",
  "4. Services",
  "5. Deliverables",
  "6. Licence",
  "7. Charges",
  "8. Payments",
  "9. Warranties",
  "10. Limitations and exclusions of liability",
  "11. Termination",
  "12. Effects of termination",
  "13. Status of Consultant",
  "14. Subcontracting",
  "15. General",
  "16. STATEMENT OF WORK",
];

// Now include the new “STATEMENT OF WORK” section in the ordering.
const agreementSectionOrder = [
  "2. Definitions",
  "3. Term",
  "4. Services",
  "5. Deliverables",
  "6. Licence",
  "7. Charges",
  "8. Payments",
  "9. Warranties",
  "10. Limitations and exclusions of liability",
  "11. Termination",
  "12. Effects of termination",
  "13. Status of Consultant",
  "14. Subcontracting",
  "15. General",
  "16. STATEMENT OF WORK",
];

/**
 * Flattens a nested object into a flat object with dot notation keys
 * @param {Object} obj - The nested object to flatten
 * @param {String} prefix - The prefix for keys (used in recursion)
 * @return {Object} A flat object with dot notation keys
 */
function flattenObject(obj, prefix = "") {
  return Object.keys(obj).reduce((acc, key) => {
    const prefixedKey = prefix ? `${prefix}.${key}` : key;

    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      // Recursively flatten nested objects
      Object.assign(acc, flattenObject(obj[key], prefixedKey));
    } else {
      // Add leaf node
      acc[prefixedKey] = obj[key];
    }

    return acc;
  }, {});
}

/**
 * Unflatten a flat object with dot notation keys back into a nested object
 * @param {Object} flatObj - The flat object to unflatten
 * @return {Object} A nested object
 */
function unflattenObject(flatObj) {
  const result = {};

  Object.keys(flatObj).forEach((key) => {
    const value = flatObj[key];
    const keys = splitPath(key);
    let current = result;

    // Navigate to the right spot in the result object
    keys.forEach((k, i) => {
      if (i === keys.length - 1) {
        // Set the value at the last key
        current[k] = value;
      } else {
        // Create the nested object if it doesn't exist
        current[k] = current[k] || {};
        current = current[k];
      }
    });
  });

  return result;
}
/**
 * Initialize the document template by storing a clean copy
 * of the initial document structure
 */
function initializeDocumentTemplate() {
  // Clone the initial document structure
  documentTemplate = JSON.parse(JSON.stringify(window.currentDocument));
}

/**
 * Get a clean copy of the document template
 * @return {Object} A fresh document template
 */
function getDocumentTemplate() {
  if (!documentTemplate) {
    initializeDocumentTemplate();
  }
  return JSON.parse(JSON.stringify(documentTemplate));
}

// Global variables to store selection information
let selectedText = "";
let selectionRange = null;

function handleTextSelection() {
  const selection = window.getSelection();

  if (
    selection.toString().trim().length > 0 &&
    document.getElementById("documentPreview").contains(selection.anchorNode)
  ) {
    // Store the selected text and range
    selectedText = selection.toString();
    selectionRange = selection.getRangeAt(0);

    // Get position for the edit button
    const rect = selectionRange.getBoundingClientRect();

    // Show the edit button near the selection
    showEditWithAIButton(rect);
  } else {
    // Remove the edit button if no text is selected
    const editButton = document.getElementById("edit-ai-button");
    if (editButton) {
      editButton.remove();
    }
  }
}
function showEditWithAIButton(rect) {
  // Remove any existing button
  const existingButton = document.getElementById("edit-ai-button");
  if (existingButton) {
    existingButton.remove();
  }

  // Create button element
  const editButton = document.createElement("div");
  editButton.id = "edit-ai-button";
  editButton.className = "floating-edit-button";
  editButton.innerHTML = `<button class="btn btn-edit">Edit with AI</button>`;

  // Position the button near the selection
  editButton.style.position = "absolute";
  editButton.style.left = `${rect.left + window.scrollX}px`;
  editButton.style.top = `${rect.bottom + window.scrollY + 5}px`;
  editButton.style.zIndex = "1000";

  // Add click event
  editButton.querySelector("button").addEventListener("click", openEditDialog);

  // Add to document
  document.body.appendChild(editButton);
}
function openEditDialog() {
  // Create dialog if it doesn't exist
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
    document
      .getElementById("submit-ai-edit")
      .addEventListener("click", submitAIEditRequest);
  }

  // Populate selected text
  document.getElementById("selected-text-display").textContent = selectedText;

  // Show the dialog
  dialog.style.display = "block";

  // Remove the floating button
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
/**
 * Get or calculate AI suggestions for a specific field
 * @param {String} path - The path to the field to update
 */
function updateValueWithAI(path) {
  const inputElement = document.querySelector(`input[data-key="${path}"]`);
  const promptElement = document.querySelector(`textarea[data-key="${path}"]`);
  const currentValue = inputElement ? inputElement.value : "";
  const customPrompt = promptElement ? promptElement.value : "";

  const aiSuggestionInput = document.querySelector(
    `input[data-ai-suggestion="${path}"]`
  );
  const saveButton = document.querySelector(
    `button.save-button[onclick="saveValue('${path}')"]`
  );

  if (!aiSuggestionInput) return;

  // Update UI to show loading state
  const aiButton = document.querySelector(
    `button.ai-button[onclick="updateValueWithAI('${path}')"]`
  );
  const originalButtonText = aiButton.textContent;
  aiButton.textContent = "Loading...";
  aiButton.disabled = true;

  // Create default prompt if none was provided
  const prompt = customPrompt || `Please improve this text: "${currentValue}"`;

  // Make API request to get AI suggestion
  fetch("/update_value", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      selectedText: currentValue,
      prompt: prompt,
      fullContent: document.getElementById("documentPreview").innerHTML,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }

      // Update UI with the AI suggestion
      aiSuggestionInput.value = data.value;
      saveButton.disabled = false;
    })
    .catch((error) => {
      console.error("Error getting AI suggestion:", error);
      aiSuggestionInput.value = "Error: " + error.message;
    })
    .finally(() => {
      // Reset button state
      aiButton.textContent = originalButtonText;
      aiButton.disabled = false;
    });
}
function submitAIEditRequest() {
  // Get the prompt from the textarea
  const prompt = document.getElementById("ai-edit-prompt").value;

  if (!prompt.trim()) {
    alert("Please enter instructions for the AI.");
    return;
  }

  // Get the full document content
  const fullContent = document.getElementById("documentPreview").innerHTML;

  // Update button to show loading state
  const submitButton = document.getElementById("submit-ai-edit");
  const originalText = submitButton.textContent;
  submitButton.textContent = "Processing...";
  submitButton.disabled = true;

  // Make the API request
  fetch("/update_value", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      selectedText: selectedText,
      prompt: prompt,
      fullContent: fullContent,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data.error) {
        throw new Error(data.error);
      }

      // Update the document with the new text
      updateDocumentWithAIResponse(data.value);

      // Close the dialog
      closeEditDialog();
    })
    .catch((error) => {
      alert("Error: " + error.message);
    })
    .finally(() => {
      // Reset button state
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    });
}
function updateDocumentWithAIResponse(newText) {
  if (!selectionRange) return;

  // Delete the original text
  selectionRange.deleteContents();

  // Insert the new text
  const textNode = document.createTextNode(newText);
  selectionRange.insertNode(textNode);

  // Clear the selection variables
  selectedText = "";
  selectionRange = null;

  // Optionally show a success message
  const successMessage = document.createElement("div");
  successMessage.className = "success";
  successMessage.textContent = "Text updated successfully";
  successMessage.style.position = "fixed";
  successMessage.style.bottom = "20px";
  successMessage.style.right = "20px";
  successMessage.style.padding = "10px 20px";
  document.body.appendChild(successMessage);

  // Remove the message after 3 seconds
  setTimeout(() => {
    successMessage.remove();
  }, 3000);
}
// Predefined questions for document
const documentQuestions = {
  step1: {
    title: "General Information",
    effectiveDate: {
      question:
        "Enter [the date of execution of a Statement of Work incorporating these Terms and Conditions] (YYYY-MM-DD):",
      type: "date",
    },
  },
  step2: {
    title: "Consultant Details",
    consultantType: {
      question: "Select Consultant Type (choose the appropriate placeholder):",
      type: "select",
      options: ["Individual", "Company", "Partnership"],
    },
    // Only show these if "Individual" is selected
    consultantIndividualName: {
      question: "Enter [individual name] for Consultant:",
      type: "text",
      showIf: "consultantType=Individual",
    },
    consultantIndividualAddress: {
      question: "Enter [address] for Consultant (Individual):",
      type: "text",
      showIf: "consultantType=Individual",
    },
    // Only show these if "Company" is selected
    consultantCompanyName: {
      question: "Enter [company name] for Consultant:",
      type: "text",
      showIf: "consultantType=Company",
    },
    consultantJurisdiction: {
      question: "Enter [jurisdiction] for Consultant:",
      type: "text",
      showIf: "consultantType=Company",
    },
    consultantRegistrationNumber: {
      question: "Enter [registration number] for Consultant:",
      type: "text",
      showIf: "consultantType=Company",
    },
    consultantCompanyAddress: {
      question: "Enter [address] for Consultant (Company):",
      type: "text",
      showIf: "consultantType=Company",
    },
    // Optional fallback field – always visible
    consultantIdentifyParty: {
      question: "Enter [identify party] for Consultant (if applicable):",
      type: "text",
    },
  },
  step3: {
    title: "Client Details",
    clientType: {
      question: "Select Client Type (choose the appropriate placeholder):",
      type: "select",
      options: ["Individual", "Company", "Partnership"],
    },
    // Only show if "Individual" is selected
    clientIndividualName: {
      question: "Enter [individual name] for Client:",
      type: "text",
      showIf: "clientType=Individual",
    },
    clientIndividualAddress: {
      question: "Enter [address] for Client (Individual):",
      type: "text",
      showIf: "clientType=Individual",
    },
    // Only show if "Company" is selected
    clientCompanyName: {
      question: "Enter [company name] for Client:",
      type: "text",
      showIf: "clientType=Company",
    },
    clientRegistrationNumber: {
      question: "Enter [registration number] for Client:",
      type: "text",
      showIf: "clientType=Company",
    },
    clientCompanyAddress: {
      question: "Enter [address] for Client (Company):",
      type: "text",
      showIf: "clientType=Company",
    },
    // Optional fallback field – always visible
  },
  step4: {
    title: "Contract Details",
    term: {
      question: "Select the term of the agreement",
      type: "select",
      options: [
        "indefinitely",
        "until a specific date",
        "until a specific event"
      ]
    },
    termDate: {
      question: "Enter specific date (if applicable)",
      type: "date",
      showIf: "term=until a specific date"
    },
    termEvent: {
      question: "Describe the specific event (if applicable)",
      type: "text",
      showIf: "term=until a specific event"
    },
    services: {
      question: "Select the service standard",
      type: "select",
      options: [
        "with reasonable skill and care",
        "in accordance with the standards of skill and care reasonably expected from a leading service provider in the Consultant's industry",
        "custom standard (specify below)"
      ]
    },
    customServices: {
      question: "If you selected 'custom standard', please specify",
      type: "textarea",
      showIf: "services=custom standard (specify below)"
    },
    deliverables: {
      question: "Select the deliverables obligation level",
      type: "select",
      options: [
        "ensure",
        "use its best endeavours to ensure", 
        "use reasonable endeavours to ensure"
      ]
    },
    charges: {
      question: "Select VAT inclusion",
      type: "select",
      options: [
        "inclusive of any applicable value added taxes",
        "exclusive of any applicable value added taxes, which will be added to those amounts and payable by the Client to the Consultant"
      ]
    },
    payments: {
      question: "Select when invoices will be issued",
      type: "select",
      options: [
        "from time to time during the Term",
        "on or after the invoicing dates set out in Section 7 of the Statement of Work",
        "at any time after the relevant Services have been delivered to the Client",
        "in advance of the delivery of the relevant Services to the Client"
      ]
    },
  },
  step5: {
    title: "Statement of Work",
    minTerm: {
      question: "Enter [Specify Minimum Term]:",
      type: "text",
    },
    specificationServices: {
      question: "Enter [Specify Services] for the Statement of Work:",
      type: "textarea",
    },
    specificationDeliverables: {
      question: "Enter [Specify Deliverables] for the Statement of Work:",
      type: "textarea",
    },
    timetable: {
      question: "Enter [Insert timetable]:",
      type: "text",
    },
    clientMaterials: {
      question: "Enter [Specify Client Materials]:",
      type: "text",
    },
    financialProvisions: {
      question: "Enter [Insert financial provisions]:",
      type: "textarea",
    },
    consultantNotices: {
      question: "Enter [Consultant contractual notices address details]:",
      type: "text",
    },
    clientNotices: {
      question: "Enter [Client contractual notices address details]:",
      type: "text",
    },
  },
};

// Store form data between steps
let formDataStore = {};

document.addEventListener("DOMContentLoaded", async function () {
  console.log("Document initialization started");
  if (!window.currentDocument) {
    console.error("No document found in window.currentDocument");
    window.currentDocument = { "Consultancy Terms and Conditions": {} };
  }

  try {
    // Initialize the document template
    initializeDocumentTemplate();

    showQuestionnaire();
    // Then initialize the preview
    updatePreview();

    // Add this line to register the highlight events
    registerHighlightEvents();

    // Initialize AI editing functionality
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

// Convert document object to HTML for preview
function convertToHtml(document) {
  let html = [];
  const documentTitle = Object.keys(document)[0];
  if (documentTitle) {
    html.push(
      `<div class="document-title"><strong>${documentTitle}</strong></div>`
    );
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
  const marginLeft = level * 20;
  const sectionClass = isMainSection ? "main-section" : "sub-section";

  if (isMainSection) {
    html.push(
      `<div class="document-line ${sectionClass}" data-path="${currentPath}" style="margin-left: ${marginLeft}px;">
        <h5><strong>${key}</strong></h5>
      </div>`
    );
  } else {
    html.push(
      `<div class="document-line ${sectionClass}" data-path="${currentPath}" style="margin-left: ${
        marginLeft + 20
      }px;">
        <h6><strong>${key}</strong></h6>
      </div>`
    );
  }

  if (typeof value === "object" && value !== null) {
    let keys = Object.keys(value);
    keys.forEach((subKey) => {
      const subValue = value[subKey];
      const subMarginLeft = marginLeft + 40;
      const subPath = `${currentPath}.${subKey}`;

      if (subValue && typeof subValue === "object") {
        if (subValue.content !== undefined) {
          html.push(
            `<div class="document-line document-content" data-path="${subPath}" style="margin-left: ${subMarginLeft}px;">
              <span data-value-path="${subPath}.content">
                <strong>${subKey}:</strong> ${subValue.content}
              </span>
            </div>`
          );
        } else {
          processSection(subKey, subValue, level + 1, currentPath);
        }
      } else {
        html.push(
          `<div class="document-line document-content" data-path="${subPath}" style="margin-left: ${subMarginLeft}px;">
            <span>
              <strong>${subKey}:</strong>
              <span data-value-path="${subPath}">${subValue}</span>
            </span>
          </div>`
        );
      }
    });
  }
}
}

// Save selection for inserted content
let savedRange = null;
const previewElem = document.getElementById("documentPreview");
if (previewElem) {
  previewElem.addEventListener("mouseup", saveSelection);
  previewElem.addEventListener("keyup", saveSelection);
}

function saveSelection() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) savedRange = sel.getRangeAt(0);
}

function showQuestionnaire() {
  // Get the right panel container instead of modal
  const container = document.getElementById("keyContainer");

  // DON'T modify the heading if there's already a save button
  const panelHeading = container.parentElement.querySelector("h2");
  const existingSaveButton = container.parentElement.querySelector("#saveDocBtn");
  
  if (panelHeading && !existingSaveButton) {
    panelHeading.innerHTML =
      'Document Information <button class="btn btn-add" onclick="submitQuestionnaire()">Save Document</button>';
  }

  // Clear existing content
  container.innerHTML = "";
  
  // Rest of the function continues...
  // Dynamically generate all steps based on documentQuestions
  let allQuestionsHTML = "";
  Object.keys(documentQuestions).forEach((stepKey) => {
    const stepData = documentQuestions[stepKey];
    allQuestionsHTML += `
        <div class="questionnaire-section">
          <h3>${stepData.title}</h3>
          <div class="step-content">
            ${createQuestionsHTML(stepData)}
          </div>
        </div>
      `;
  });

  // Add generated HTML to the container
  container.innerHTML = allQuestionsHTML;

  // Add change handlers for real-time updates on all inputs
  document
    .querySelectorAll(
      "#keyContainer input, #keyContainer select, #keyContainer textarea"
    )
    .forEach((input) => {
      input.addEventListener("input", function () {
        // Store the value with its unique ID
        formDataStore[this.id] = this.value;

        // For party type dropdowns, handle specially
        if (this.id === "consultantType" || this.id === "clientType") {
          handlePartyTypeChange(this);
        } else if (this.tagName === "SELECT") {
          handleFieldChange(this);
        } else {
          // Update the contract in real time for other inputs
          updateDocumentWithFormData(formDataStore);
          updatePreview();
        }
      });
    });

  // Restore all saved form data for every step dynamically
  Object.keys(documentQuestions).forEach((stepKey) => {
    const stepNumber = parseInt(stepKey.replace("step", ""), 10);
    restoreStepData(stepNumber);
  });
}

function createQuestionStep(stepNumber) {
  const stepData = documentQuestions[`step${stepNumber}`];
  const container = document.getElementById("questionsContainer");
  const totalSteps = Object.keys(documentQuestions).length;

  container.innerHTML = `
          <h4>${stepData.title}</h4>
          <div class="step-content">
              ${createQuestionsHTML(stepData)}
          </div>
          <div class="step-navigation">
              ${
                stepNumber > 1
                  ? `<button class="btn btn-edit" onclick="navigateStep(${
                      stepNumber - 1
                    })">Previous</button>`
                  : ""
              }
              ${
                stepNumber < totalSteps
                  ? `<button class="btn btn-edit" onclick="navigateStep(${
                      stepNumber + 1
                    })">Next</button>`
                  : `<button class="btn btn-add" onclick="submitQuestionnaire()">Save Contract</button>`
              }
          </div>
      `;

  // Restore any previously saved data for this step
  restoreStepData(stepNumber);
}

function createQuestionsHTML(stepData) {
  let html = "";

  // Determine section class based on the step title.
  // For example, if the title contains "Consultant" or "Client", assign specific classes.
  const isConsultantSection =
    stepData.title && stepData.title.includes("Consultant");
  const isClientSection = stepData.title && stepData.title.includes("Client");
  const sectionClass = isConsultantSection
    ? "consultant-section"
    : isClientSection
    ? "client-section"
    : "";

  // Loop over each property in stepData (excluding the title)
  for (const [key, data] of Object.entries(stepData)) {
    if (key === "title") continue;

    if (typeof data === "object" && !data.type) {
      // This property represents a group of questions.
      // Use group classes to differentiate consultant/client groups if applicable.
      const groupClass = isConsultantSection
        ? "consultant-group"
        : isClientSection
        ? "client-group"
        : "";
      html += `<div class="question-group ${groupClass}" id="${key}-group">`;
      html += createQuestionsHTML(data);
      html += "</div>";
    } else {
      // This property represents a single question field.
      html += createQuestionField(key, data, sectionClass);
    }
  }
  return html;
}

function createQuestionField(key, data, sectionClass = "") {
  if (!data.question) return ""; // Skip if no question

  let visibilityAttr = "";
  if (data.showIf) {
    const [condition, value] = data.showIf.split("=");
    visibilityAttr = `data-show-if="${condition}" data-show-value="${value}" style="display: none;"`;
  }

  return `
    <div class="question-field ${sectionClass}" ${visibilityAttr}>
      <label>${data.question}</label>
      ${createInputElement(key, data)}
    </div>
  `;
}

function createInputElement(key, data) {
  // Determine which section we're in and set a prefix for the element ID.
  let prefix = "";
  const dataShowIf = data.showIf || "";
  if (dataShowIf.includes("consultantType=")) {
    const type = dataShowIf.split("=")[1].toLowerCase();
    prefix = `consultant_${type}_`;
  } else if (dataShowIf.includes("clientType=")) {
    const type = dataShowIf.split("=")[1].toLowerCase();
    prefix = `client_${type}_`;
  } else if (key === "consultantType" || key === "clientType") {
    // For the type selectors themselves, no prefix is applied.
    prefix = "";
  }

  // Generate the full ID by combining the prefix (if any) with the key.
  const fullId = prefix ? prefix + key : key;

  // Get affected paths for highlighting
  const affectedPaths = documentPathMap[fullId] ?
    `data-affects-path="${documentPathMap[fullId].join(',')}"` : "";
    
  // Handle the special case for type selectors by returning a select element.
  if (key === "consultantType" || key === "clientType") {
    return `
        <select id="${key}" onchange="handlePartyTypeChange(this)" ${affectedPaths}>
          <option value="">Select...</option>
          ${data.options
            .map((opt) => `<option value="${opt}">${opt}</option>`)
            .join("")}
        </select>
      `;
  }

  // Return the appropriate input element based on the type specified.
  switch (data.type) {
    case "select":
      return `
        <select id="${fullId}" onchange="handleFieldChange(this)" data-original-key="${key}" ${affectedPaths}>
          <option value="">Select...</option>
          ${data.options
            .map((opt) => `<option value="${opt}">${opt}</option>`)
            .join("")}
        </select>
      `;
    case "textarea":
      return `<textarea id="${fullId}" class="form-textarea" data-original-key="${key}" ${affectedPaths}></textarea>`;
    case "date":
      return `<input type="date" id="${fullId}" data-original-key="${key}" ${affectedPaths}>`;
    default:
      return `<input type="text" id="${fullId}" data-original-key="${key}" ${affectedPaths}>`;
  }
}

function handleFieldChange(element) {
  // Save the value
  formDataStore[element.id] = element.value;

  // Handle conditional fields
  const condition = element.id;
  const value = element.value;

  document
    .querySelectorAll(`[data-show-if="${condition}"]`)
    .forEach((field) => {
      field.style.display =
        field.dataset.showValue === value ? "block" : "none";
    });

  // Update document based on new field value
  updateDocumentWithFormData(formDataStore);
  updatePreview();
}

function navigateStep(stepNumber) {
  // Save current step data
  saveStepData(getCurrentStep());
  // Show new step
  createQuestionStep(stepNumber);
}

function getCurrentStep() {
  const stepContent = document.querySelector(".step-content");
  if (!stepContent) return 1;

  // Analyze content to determine current step
  // This is a simple implementation; you might want to add more robust detection
  for (let i = 1; i <= 4; i++) {
    if (stepContent.innerHTML.includes(documentQuestions[`step${i}`].title)) {
      return i;
    }
  }
  return 1;
}

function saveStepData(stepNumber) {
  const stepData = documentQuestions[`step${stepNumber}`];
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && input.value) {
      formDataStore[input.id] = input.value;
    }
  });
}

function restoreStepData(stepNumber) {
  // Restore all saved values for inputs (text, select, textarea) related to the current step.
  // This ensures that if the user navigates between steps, previously entered contract data is retained.
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && formDataStore[input.id]) {
      input.value = formDataStore[input.id];

      // For SELECT elements, update conditional field visibility based on the stored value.
      if (input.tagName === "SELECT") {
        // For party type selectors, trigger the specific handler to display the appropriate fields.
        if (input.id === "consultantType" || input.id === "clientType") {
          handlePartyTypeChange(input);
        } else {
          handleFieldChange(input);
        }
      }
    }
  });
}

function closeQuestionnaireModal() {
  document.getElementById("questionnaireModal").style.display = "none";
}

function submitQuestionnaire() {
  try {
    // Update document with all collected data
    updateDocumentWithFormData(formDataStore);

    // Update UI
    updatePreview();

    // Show success message
    const successMessage = document.createElement("div");
    successMessage.className = "success";
    successMessage.textContent = "Document information saved successfully!";
    successMessage.style.position = "fixed";
    successMessage.style.bottom = "20px";
    successMessage.style.right = "20px";
    successMessage.style.padding = "10px 20px";
    document.body.appendChild(successMessage);

    // Remove message after 3 seconds
    setTimeout(() => {
      successMessage.remove();
    }, 3000);
  } catch (error) {
    console.error("Error submitting questionnaire:", error);
    alert("There was an error saving the document. Please try again.");
  }
}

function formatDate(dateStr) {
  // Assume dateStr is in format yyyy-mm-dd
  const [year, month, day] = dateStr.split("-");
  return `${day}-${month}-${year}`;
}

// Simplified handlePartyTypeChange function - no need to manually reset document
function handlePartyTypeChange(selectElement) {
  // Determine whether we're dealing with a consultant or client selector.
  const isConsultant = selectElement.id === "consultantType";
  const isClient = selectElement.id === "clientType";
  const selectedType = selectElement.value;

  if (!selectedType) return;

  // Optionally, if you are prefixing form data, clear previously stored data for different selections
  const prefix = isConsultant ? "consultant_" : "client_";
  const allPartyTypes = ["individual", "company", "partnership"];
  Object.keys(formDataStore).forEach((key) => {
    if (key.startsWith(prefix)) {
      const keyWithoutPrefix = key.substring(prefix.length);
      const matchesOtherType = allPartyTypes
        .filter((type) => type !== selectedType.toLowerCase())
        .some((type) => keyWithoutPrefix.startsWith(type));
      if (matchesOtherType) {
        delete formDataStore[key];
      }
    }
  });

  // Save the currently selected party type in the form data store.
  formDataStore[selectElement.id] = selectedType;

  // Update the UI: Show only fields that match the current selection.
  document
    .querySelectorAll(`[data-show-if="${selectElement.id}"]`)
    .forEach((field) => {
      const showValue = field.getAttribute("data-show-value");
      // Only display the field if its showValue matches the selected option.
      field.style.display = showValue === selectedType ? "block" : "none";
    });

  // Update the underlying document data and preview.
  updateDocumentWithFormData(formDataStore);
  updatePreview();
}

/**
 * Maps form data to document structure
 * @param {Object} flatDoc - Flattened document object
 * @param {Object} formData - The form data
 * @return {Object} Updated flat document
 */
function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };
  // Use the document title from your JSON
  const documentTitle =
    Object.keys(window.currentDocument)[0] ||
    "Consultancy Terms and Conditions";

  // Map Effective Date – add this placeholder under "1. Introduction"
  if (formData.effectiveDate) {
    const formattedDate = formatDate(formData.effectiveDate);
    const dateKey = `${documentTitle}.1. Introduction.Effective Date`;
    updatedFlatDoc[dateKey] = formattedDate;
  }

  // Map Term to "3. Term.3.2.content" - with OPTIONS
  if (formData.term) {
    const termKey = `${documentTitle}.3. Term.3.2.content`;
    let termContent = "The Contract shall continue in force ";
    
    if (formData.term === "indefinitely") {
      termContent += "[indefinitely]";
    } else if (formData.term === "until a specific date") {
      termContent += `[until ${formData.termDate || "*[date]*"}, at the beginning of which this Agreement shall terminate automatically]`;
    } else if (formData.term === "until a specific event") {
      termContent += `[until ${formData.termEvent || "*[event]*"}, upon which this Agreement shall terminate automatically]`;
    } else {
      termContent += formData.term;
    }
    
    termContent += ", subject to termination in accordance with Clause 11.";
    updatedFlatDoc[termKey] = termContent;
  }

  // Map Services to "4. Services.4.2.content" - with OPTIONS
  if (formData.services) {
    const servicesKey = `${documentTitle}.4. Services.4.2.content`;
    let servicesContent = "The Consultant shall provide the Services ";
    
    if (formData.services === "custom standard (specify below)" && formData.customServices) {
      servicesContent += `[${formData.customServices}].`;
    } else {
      servicesContent += `[${formData.services}].`;
    }
    
    updatedFlatDoc[servicesKey] = servicesContent;
  }

  // Map Deliverables to "5. Deliverables.5.3.content" - with OPTIONS
  if (formData.deliverables) {
    const deliverablesKey = `${documentTitle}.5. Deliverables.5.3.content`;
    let deliverablesContent = `The Consultant shall [${formData.deliverables}] that the Deliverables are delivered to the Client in accordance with the timetable set out in Section 5 of the Statement of Work[ or agreed by the parties in writing].`;
    updatedFlatDoc[deliverablesKey] = deliverablesContent;
  }

  // Map Charges to "7. Charges.7.2.content" - with OPTIONS
  if (formData.charges) {
    const chargesKey = `${documentTitle}.7. Charges.7.2.content`;
    let chargesContent = `All amounts stated in or in relation to these Terms and Conditions are, unless the context requires otherwise, stated [${formData.charges}].`;
    updatedFlatDoc[chargesKey] = chargesContent;
  }

  // Map Payments to "8. Payments.8.1.content" - with OPTIONS
  if (formData.payments) {
    const paymentsKey = `${documentTitle}.8. Payments.8.1.content`;
    let paymentsContent = `The Consultant shall issue invoices for the Charges to the Client [${formData.payments}].`;
    updatedFlatDoc[paymentsKey] = paymentsContent;
  }

  // Map Consultant Details into a new section "Consultant Details"
  if (formData.consultantType) {
    const consultantKey = `${documentTitle}.2. Definitions.2.1.Consultant`;
    let consultantContent = "";
    if (formData.consultantType === "Individual") {
      // Using the prefixed keys created by createInputElement:
      consultantContent = `${
        formData["consultant_individual_consultantIndividualName"] ||
        "[individual name]"
      }, ${
        formData["consultant_individual_consultantIndividualAddress"] ||
        "[address]"
      }`;
    } else if (formData.consultantType === "Company") {
      consultantContent = `[company name]: ${
        formData["consultant_company_consultantCompanyName"] || "[company name]"
      }, [jurisdiction]: ${
        formData["consultant_company_consultantJurisdiction"] ||
        "[jurisdiction]"
      }, [registration number]: ${
        formData["consultant_company_consultantRegistrationNumber"] ||
        "[registration number]"
      }, [address]: ${
        formData["consultant_company_consultantCompanyAddress"] || "[address]"
      }`;
    } else if (formData.consultantType === "Partnership") {
      consultantContent = `[PARTNERSHIP NAME]: ${
        formData["consultant_partnership_consultantPartnershipName"] ||
        "[PARTNERSHIP NAME]"
      }, [address]: ${
        formData["consultant_partnership_consultantPartnershipAddress"] ||
        "[address]"
      }`;
    }
    // Append fallback field if available (no prefix expected)
    if (formData.consultantIdentifyParty) {
      consultantContent += ` OR [identify party]: ${formData.consultantIdentifyParty}`;
    }
    updatedFlatDoc[consultantKey] = consultantContent;
  }

  // Map Client Details into "16. STATEMENT OF WORK.16.1.content"
  if (formData.clientType) {
    const clientKey = `${documentTitle}.16. STATEMENT OF WORK.16.1.content`;
    let clientContent = "";
    if (formData.clientType === "Individual") {
      clientContent = `[individual name]: ${
        formData["client_individual_clientIndividualName"] ||
        "[individual name]"
      }, [address]: ${
        formData["client_individual_clientIndividualAddress"] || "[address]"
      }`;
    } else if (formData.clientType === "Company") {
      clientContent = `[company name]: ${
        formData["client_company_clientCompanyName"] || "[company name]"
      }, [registration number]: ${
        formData["client_company_clientRegistrationNumber"] ||
        "[registration number]"
      }, [address]: ${
        formData["client_company_clientCompanyAddress"] || "[address]"
      }`;
    } else if (formData.clientType === "Partnership") {
      clientContent = `[PARTNERSHIP NAME]: ${
        formData["client_partnership_clientPartnershipName"] ||
        "[PARTNERSHIP NAME]"
      }, [address]: ${
        formData["client_partnership_clientPartnershipAddress"] || "[address]"
      }`;
    }
    updatedFlatDoc[clientKey] = clientContent + ' (the "Client")';
  }

  // Map Consideration (if provided) to Charges (overwrite if necessary)
  if (formData.consideration) {
    const chargesKey = `${documentTitle}.7. Charges.7.1.content`;
    updatedFlatDoc[
      chargesKey
    ] = `The Client shall pay the Charges to the Consultant ... ${formData.consideration} ...`;
  }

  // Map Execution signature blocks for Consultant.
  if (formData.consultantType) {
    const consultantSigKey = `${documentTitle}.EXECUTION.signature_blocks.consultant`;
    let signatureContent = "";
    if (formData.consultantType === "Individual") {
      signatureContent = `SIGNED BY ${
        formData["consultant_individual_consultantIndividualName"] ||
        "[individual name]"
      } on *[...........], the Consultant`;
    } else if (formData.consultantType === "Company") {
      signatureContent = `SIGNED BY ${
        formData["consultant_company_consultantCompanyName"] || "[COMPANY NAME]"
      } on *[...........], duly authorised for and on behalf of ${
        formData["consultant_company_consultantCompanyName"] || "[COMPANY NAME]"
      }`;
    } else if (formData.consultantType === "Partnership") {
      signatureContent = `SIGNED BY ${
        formData["consultant_partnership_consultantPartnershipName"] ||
        "[PARTNERSHIP NAME]"
      } on *[...........], duly authorised for and on behalf of ${
        formData["consultant_partnership_consultantPartnershipName"] ||
        "[PARTNERSHIP NAME]"
      }`;
    }
    updatedFlatDoc[consultantSigKey] = signatureContent;
  }

  // Map Execution signature blocks for Client.
  if (formData.clientType) {
    const clientSigKey = `${documentTitle}.EXECUTION.signature_blocks.client`;
    let signatureContent = "";
    if (formData.clientType === "Individual") {
      signatureContent = `SIGNED BY ${
        formData["client_individual_clientIndividualName"] ||
        "[individual name]"
      } on *[...........], the Client`;
    } else if (formData.clientType === "Company") {
      signatureContent = `SIGNED BY ${
        formData["client_company_clientCompanyName"] || "[COMPANY NAME]"
      } on *[...........], duly authorised for and on behalf of ${
        formData["client_company_clientCompanyName"] || "[COMPANY NAME]"
      }`;
    } else if (formData.clientType === "Partnership") {
      signatureContent = `SIGNED BY ${
        formData["client_partnership_clientPartnershipName"] ||
        "[PARTNERSHIP NAME]"
      } on *[...........], duly authorised for and on behalf of ${
        formData["client_partnership_clientPartnershipName"] ||
        "[PARTNERSHIP NAME]"
      }`;
    }
    updatedFlatDoc[clientSigKey] = signatureContent;
  }

  // Map Statement of Work details from step5, if any (similarly update keys)
  if (formData.minTerm) {
    const minTermKey = `${documentTitle}.16. STATEMENT OF WORK.16.2.content`;
    updatedFlatDoc[minTermKey] = formData.minTerm;
  }
  if (formData.specificationServices) {
    const specServicesKey = `${documentTitle}.16. STATEMENT OF WORK.16.3.content`;
    updatedFlatDoc[specServicesKey] = formData.specificationServices;
  }
  if (formData.specificationDeliverables) {
    const specDeliverablesKey = `${documentTitle}.16. STATEMENT OF WORK.16.4.content`;
    updatedFlatDoc[specDeliverablesKey] = formData.specificationDeliverables;
  }
  if (formData.timetable) {
    const timetableKey = `${documentTitle}.16. STATEMENT OF WORK.16.5.content`;
    updatedFlatDoc[timetableKey] = formData.timetable;
  }
  if (formData.clientMaterials) {
    const clientMaterialsKey = `${documentTitle}.16. STATEMENT OF WORK.16.6.content`;
    updatedFlatDoc[clientMaterialsKey] = formData.clientMaterials;
  }
  if (formData.financialProvisions) {
    const financialKey = `${documentTitle}.16. STATEMENT OF WORK.16.7.content`;
    updatedFlatDoc[financialKey] = formData.financialProvisions;
  }
  if (formData.consultantNotices) {
    const consultantNoticesKey = `${documentTitle}.16. STATEMENT OF WORK.16.8.consultant_notices`;
    updatedFlatDoc[consultantNoticesKey] = formData.consultantNotices;
  }
  if (formData.clientNotices) {
    const clientNoticesKey = `${documentTitle}.16. STATEMENT OF WORK.16.8.client_notices`;
    updatedFlatDoc[clientNoticesKey] = formData.clientNotices;
  }

  return updatedFlatDoc;
}

// Main function for updating document with form data (using flatten/unflatten approach)
function updateDocumentWithFormData(formData) {
  const flatCurrentDoc = flattenObject(window.currentDocument);
  const updatedFlatDoc = applyFormDataToFlatDocument(flatCurrentDoc, formData);
  const updatedDoc = unflattenObject(updatedFlatDoc);
  window.currentDocument = updatedDoc;
  // Optionally update your global template:
  documentTemplate = JSON.parse(JSON.stringify(window.currentDocument));
  updatePreview();
}

// Enable editing mode
function enableEditing() {
  const previewElem = document.getElementById("documentPreview");
  if (!previewElem) return;
  previewElem.contentEditable = true;
  previewElem.style.border = "1px dashed #aaa";
  document.getElementById("insertContentButton").style.display = "inline-block";
  document.getElementById("enableEditingButton").style.display = "none";
}

// Open and close modal for inserting new content
function openInsertDialog() {
  document.getElementById("insertDialog").style.display = "block";
  document.getElementById("newKey").focus();
}

function closeInsertDialog() {
  document.getElementById("insertDialog").style.display = "none";
  document.getElementById("documentPreview").focus();
}

// Insert new content with styling options
function insertNewContent() {
  const key = document.getElementById("newKey").value.trim();
  const value = document.getElementById("newValue").value.trim();
  const keyFontSize =
    document.getElementById("keyFontSize").value.trim() || "16";
  const keyColor = document.getElementById("keyColor").value || "#000000";
  const keyFontFamily = document.getElementById("keyFontFamily").value;
  const keyFontStyle = document.getElementById("keyFontStyle").value;
  const keyFontWeight = document.getElementById("keyFontWeight").value;
  const keyTextDecoration = document.getElementById("keyTextDecoration").value;
  const valueFontSize =
    document.getElementById("valueFontSize").value.trim() || "14";
  const valueColor = document.getElementById("valueColor").value || "#333333";
  const valueFontFamily = document.getElementById("valueFontFamily").value;
  const valueFontStyle = document.getElementById("valueFontStyle").value;
  const valueFontWeight = document.getElementById("valueFontWeight").value;
  const valueTextDecoration = document.getElementById(
    "valueTextDecoration"
  ).value;

  if (key === "" && value === "") {
    alert("Please enter at least a key or a value.");
    return;
  }

  const newPara = document.createElement("p");
  newPara.innerHTML = `
        <span class="key" style="
            font-size: ${keyFontSize + "px"};
            color: ${keyColor};
            font-family: ${keyFontFamily};
            font-style: ${keyFontStyle};
            font-weight: ${keyFontWeight};
            text-decoration: ${keyTextDecoration}
        ">
            ${key}:
        </span>
        <span class="value" style="
            font-size: ${valueFontSize + "px"};
            color: ${valueColor};
            font-family: ${valueFontFamily};
            font-style: ${valueFontStyle};
            font-weight: ${valueFontWeight};
            text-decoration: ${valueTextDecoration}
        ">
            ${value}
        </span>
    `;

  const previewElem = document.getElementById("documentPreview");
  if (savedRange && previewElem.contains(savedRange.startContainer)) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
    savedRange.deleteContents();
    savedRange.insertNode(newPara);
    savedRange.setStartAfter(newPara);
    savedRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(savedRange);
  } else {
    previewElem.appendChild(newPara);
  }

  newPara.scrollIntoView({ behavior: "smooth" });

  // Reset inputs
  document.getElementById("newKey").value = "";
  document.getElementById("newValue").value = "";
  document.getElementById("keyFontSize").value = "";
  document.getElementById("valueFontSize").value = "";
  document.getElementById("keyColor").value = "#000000";
  document.getElementById("valueColor").value = "#333333";
  document.getElementById("keyFontFamily").selectedIndex = 0;
  document.getElementById("keyFontStyle").selectedIndex = 0;
  document.getElementById("keyFontWeight").selectedIndex = 0;
  document.getElementById("keyTextDecoration").selectedIndex = 0;
  document.getElementById("valueFontFamily").selectedIndex = 0;
  document.getElementById("valueFontStyle").selectedIndex = 0;
  document.getElementById("valueFontWeight").selectedIndex = 0;
  document.getElementById("valueTextDecoration").selectedIndex = 0;

  closeInsertDialog();
}

/* --- Functions for Adding Key-Value Pair under ASSIGNMENT --- */
function openAddKeyValueDialog() {
  document.getElementById("addKeyValueDialog").style.display = "block";
  document.getElementById("newKVKey").focus();
}

function closeAddKeyValueDialog() {
  document.getElementById("addKeyValueDialog").style.display = "none";
  document.getElementById("keyContainer").focus();
}

function addKeyValuePair() {
  const key = document.getElementById("newKVKey").value.trim();
  const value = document.getElementById("newKVValue").value.trim();
  const errorDiv = document.getElementById("addDialogError");

  if (key === "" && value === "") {
    errorDiv.style.display = "block";
    errorDiv.textContent = "Please enter at least a key or a value.";
    return;
  } else {
    errorDiv.style.display = "none";
  }

  const documentTitle = Object.keys(window.currentDocument)[0];
  // Use a new section (e.g., "Additional Terms") to store extra key-value pairs.
  const additionalSectionKey = "Additional Terms";

  if (
    !window.currentDocument[documentTitle] ||
    !window.currentDocument[documentTitle][additionalSectionKey]
  ) {
    if (!window.currentDocument[documentTitle]) {
      window.currentDocument[documentTitle] = {};
    }
    window.currentDocument[documentTitle][additionalSectionKey] = {};
  }

  // Add the new key-value pair into the "Additional Terms" section.
  window.currentDocument[documentTitle][additionalSectionKey][key] = {
    content: value,
  };

  updatePreview();
  updateKeyEditor();

  // Clear the input fields and close the dialog.
  document.getElementById("newKVKey").value = "";
  document.getElementById("newKVValue").value = "";
  closeAddKeyValueDialog();
}

// Functions for Adding Sub Key-Value Pair
function openAddSubKeyValueDialog() {
  const parentKeySelect = document.getElementById("parentKeySelect");
  parentKeySelect.innerHTML = "";

  const documentTitle = Object.keys(window.currentDocument)[0];
  // Use the new section for additional key-value pairs instead of "AGREEMENT"
  const additionalSectionKey = "Additional Terms";

  if (
    window.currentDocument[documentTitle] &&
    window.currentDocument[documentTitle][additionalSectionKey]
  ) {
    const additionalObj =
      window.currentDocument[documentTitle][additionalSectionKey];
    Object.keys(additionalObj).forEach(function (key) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = key;
      parentKeySelect.appendChild(option);
    });
  }

  document.getElementById("addSubKeyValueDialog").style.display = "block";
}

function closeAddSubKeyValueDialog() {
  document.getElementById("addSubKeyValueDialog").style.display = "none";
  document.getElementById("keyContainer").focus();
}

function addSubKeyValuePair() {
  const parentKey = document.getElementById("parentKeySelect").value;
  const subKey = document.getElementById("subKey").value.trim();
  const subValue = document.getElementById("subValue").value.trim();
  const errorDiv = document.getElementById("subDialogError");

  if (!parentKey || subKey === "" || subValue === "") {
    errorDiv.style.display = "block";
    errorDiv.textContent =
      "Please select a parent and enter both sub key and sub value.";
    return;
  } else {
    errorDiv.style.display = "none";
  }

  const documentTitle = Object.keys(window.currentDocument)[0];
  // Use the new section "Additional Terms" for sub key-value pairs.
  const additionalSectionKey = "Additional Terms";

  if (
    !window.currentDocument[documentTitle] ||
    !window.currentDocument[documentTitle][additionalSectionKey]
  ) {
    alert("Additional Terms section does not exist.");
    return;
  }

  const additionalObj =
    window.currentDocument[documentTitle][additionalSectionKey];
  if (!additionalObj[parentKey]) {
    additionalObj[parentKey] = {};
  }

  additionalObj[parentKey][subKey] = { content: subValue };
  updatePreview();
  updateKeyEditor();

  document.getElementById("subKey").value = "";
  document.getElementById("subValue").value = "";
  closeAddSubKeyValueDialog();
}

/* --- Get Ordered Paths for Key Editor --- */
function getOrderedPaths(obj) {
  let paths = [];
  const documentTitle =
    Object.keys(window.currentDocument)[0] ||
    "Consultancy Terms and Conditions";

  if (documentTitle) {
    const mainContent = obj[documentTitle];
    sectionOrder.forEach((section) => {
      if (mainContent[section]) {
        processSectionForPaths(
          mainContent[section],
          `${documentTitle}.${section}`
        );
      }
    });
  }

  function processSectionForPaths(section, currentPath) {
    if (!section || typeof section !== "object") return;
    let keys = Object.keys(section);
    keys.forEach((key) => {
      const value = section[key];
      if (typeof value === "object" && value !== null) {
        if ("content" in value) {
          paths.push({
            path: `${currentPath}.${key}.content`,
            value: value.content,
          });
        } else {
          processSectionForPaths(value, `${currentPath}.${key}`);
        }
      } else if (typeof value === "string") {
        paths.push({ path: `${currentPath}.${key}`, value: value });
      }
    });
  }

  return paths;
}

/* --- Update Document Preview --- */
function updatePreview() {
  const previewElem = document.getElementById("documentPreview");
  if (!previewElem) {
    console.error("Preview element not found");
    return;
  }

  try {
    if (!window.currentDocument) {
      throw new Error("Current contract document is not defined.");
    }
    const html = convertToHtml(window.currentDocument);
    previewElem.innerHTML = html;
  } catch (error) {
    console.error("Error updating contract preview:", error);
    previewElem.innerHTML =
      '<div class="error">Error loading contract preview</div>';
  }
}

/* --- Update Key Editor --- */
function updateKeyEditor() {
  const container = document.getElementById("keyContainer");
  if (!container) {
    console.error("Key container element not found");
    return;
  }

  try {
    const paths = getOrderedPaths(window.currentDocument);
    const html = paths
      .map(({ path, value }) => {
        // Disable AI suggestion editing for non-editable fields.
        // For example, fields containing "Effective Date", "Consultant Details",
        // or "Client details" are considered non-editable.
        const isNonEditable =
          path.includes("Effective Date") ||
          path.includes("Consultant Details") ||
          path.includes("Client details");

        return `
            <div class="key-editor-item">
              <div class="key-path"><strong>${path}</strong></div>
              <div class="value-section">
                <label>Current Value:</label>
                <input type="text" class="value-input" value="${
                  value || ""
                }" readonly data-key="${path}" data-original-value="${
          value || ""
        }">
    
                <label>Custom Prompt (optional):</label>
                <textarea class="prompt-input" placeholder="Enter custom instructions for AI..." data-key="${path}"></textarea>
    
                <label>AI Suggestion:</label>
                <input type="text" class="value-input" data-ai-suggestion="${path}" readonly>
    
                <div class="button-group">
                  ${
                    isNonEditable
                      ? `<button class="btn btn-edit edit-button" onclick="editValue('${path}')">Edit</button>`
                      : `<button class="btn btn-edit ai-button" onclick="updateValueWithAI('${path}')">Get AI Suggestion</button>
                         <button class="btn btn-edit edit-button" onclick="editValue('${path}')">Edit</button>`
                  }
                  <button class="btn btn-edit save-button" onclick="saveValue('${path}')" disabled>Save Changes</button>
                </div>
                <div class="error" id="error-${path}" style="display: none;"></div>
                <div class="success" id="success-${path}" style="display: none;"></div>
              </div>
            </div>
          `;
      })
      .join("");

    container.innerHTML = html;

    document.querySelectorAll(".value-input").forEach((input) => {
      input.addEventListener("input", function () {
        const path = this.getAttribute("data-key");
        const originalValue = this.getAttribute("data-original-value");
        const saveButton = document.querySelector(
          `button.save-button[onclick="saveValue('${path}')"]`
        );
        if (this.value !== originalValue) {
          saveButton.disabled = false;
        } else {
          saveButton.disabled = true;
        }
      });
    });
  } catch (error) {
    console.error("Error updating key editor:", error);
    container.innerHTML = '<div class="error">Error loading key editor</div>';
  }
}

/* --- Edit Value --- */
function editValue(path) {
  const input = document.querySelector(`input[data-key="${path}"]`);
  const editButton = document.querySelector(
    `button.edit-button[onclick="editValue('${path}')"]`
  );
  const saveButton = document.querySelector(
    `button.save-button[onclick="saveValue('${path}')"]`
  );
  const aiButton = document.querySelector(
    `button.ai-button[onclick="updateValueWithAI('${path}')"]`
  );

  input.readOnly = false;
  editButton.style.display = "none";
  if (aiButton) {
    aiButton.style.display = "none";
  }

  // Enable save button for non-editable fields based on keywords
  if (
    path.includes("Effective Date") ||
    path.includes("Consultant Details") ||
    path.includes("Client details")
  ) {
    saveButton.disabled = false;
  }
}

/* --- Utility Functions --- */
function splitPath(path) {
  let parts = path.split(".");
  return mergeWithRules(parts);
}

function mergeWithRules(tokenArray) {
  let result = [];
  for (let i = 0; i < tokenArray.length; i++) {
    let part = tokenArray[i].trim();
    if (i < tokenArray.length - 1) {
      let nextPart = tokenArray[i + 1].trim();
      if (/^\d+$/.test(part) && /^\D/.test(nextPart)) {
        result.push(part + ". " + nextPart);
        i++;
        continue;
      }
      if (/^\d+$/.test(part) && /^\d+$/.test(nextPart)) {
        result.push(part + "." + nextPart);
        i++;
        continue;
      }
    }
    result.push(part);
  }
  return result;
}

/* --- Save Value --- */
function saveValue(path) {
  const input = document.querySelector(`input[data-key="${path}"]`);
  const suggestion = document.querySelector(
    `input[data-ai-suggestion="${path}"]`
  )?.value;
  const editButton = document.querySelector(
    `button.edit-button[onclick="editValue('${path}')"]`
  );
  const aiButton = document.querySelector(
    `button.ai-button[onclick="updateValueWithAI('${path}')"]`
  );
  const newValue = suggestion || input.value;

  if (!newValue) return;

  try {
    // Split the path into parts based on the updated structure
    const pathParts = splitPath(path);
    let current = window.currentDocument;

    // Traverse the nested contract object until reaching the target key.
    for (let i = 0; i < pathParts.length - 1; i++) {
      let part = pathParts[i].replace(/\["(.*)"\]/, "$1");
      if (!current[part]) current[part] = {};
      current = current[part];
    }

    // Update the final key with the new value.
    let lastPart = pathParts[pathParts.length - 1].replace(/\["(.*)"\]/, "$1");
    current[lastPart] = newValue;

    // Update the preview display for this key.
    const previewElement = document.querySelector(
      `span[data-value-path="${path}"]`
    );
    if (previewElement) {
      let keyLabel = previewElement.querySelector("strong");
      if (keyLabel) {
        keyLabel.nextSibling.nodeValue = " " + newValue;
      } else {
        previewElement.textContent = newValue;
      }
    }

    // Update the input so that it becomes read-only and stores the new value.
    const currentValueInput = document.querySelector(
      `input[data-key="${path}"]`
    );
    if (currentValueInput) {
      currentValueInput.value = newValue;
      currentValueInput.readOnly = true;
      currentValueInput.setAttribute("data-original-value", newValue);
    }

    // Clear any AI suggestion input.
    const suggestionInput = document.querySelector(
      `input[data-ai-suggestion="${path}"]`
    );
    if (suggestionInput) {
      suggestionInput.value = "";
    }

    // Disable the save button since the value is now up-to-date.
    const saveButton = document.querySelector(
      `button.save-button[onclick="saveValue('${path}')"]`
    );
    if (saveButton) {
      saveButton.disabled = true;
    }

    // Restore the display of AI and edit buttons.
    if (aiButton) aiButton.style.display = "";
    if (editButton) editButton.style.display = "";

    // Show a temporary success message.
    const successDiv = document.getElementById(`success-${path}`);
    if (successDiv) {
      successDiv.textContent = "Changes saved successfully";
      successDiv.style.display = "block";
      setTimeout(() => {
        successDiv.style.display = "none";
      }, 3000);
    }

    // Hide any error message.
    const errorDiv = document.getElementById(`error-${path}`);
    if (errorDiv) errorDiv.style.display = "none";
  } catch (error) {
    console.error("Error saving value:", error);
    const errorDiv = document.getElementById(`error-${path}`);
    if (errorDiv) {
      errorDiv.textContent = "Failed to save changes";
      errorDiv.style.display = "block";
    }
  }
}

function downloadWordDocx() {
  // Clone the content to avoid modifying the original
  const previewElem = document.getElementById("documentPreview");
  const contentClone = previewElem.cloneNode(true);

  // Clean up content before converting
  cleanupForDocx(contentClone);

  const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Document</title>
            <style>
                @page {
                    margin: 1in;
                }
                body {
                    font-family: Verdana, sans-serif;
                    font-size: 10pt;
                    line-height: 1.3;
                    color: #000;
                }
                
                /* Document title */
                .document-title {
                    font-size: 14pt;
                    font-weight: bold;
                    margin-bottom: 24pt;
                }
                .document-title strong {
                    font-size: 14pt;
                }
                
                /* Main sections (DATE, PARTIES, etc.) */
                .main-section h5 {
                    font-size: 12pt;
                    font-weight: bold;
                    margin-top: 18pt;
                    margin-bottom: 12pt;
                    text-transform: uppercase;
                }
                .main-section h5 strong {
                    font-size: 12pt;
                }
                
                /* Sub-sections */
                .sub-section h6 {
                    font-size: 10pt;
                    font-weight: bold;
                    margin-top: 12pt;
                    margin-bottom: 6pt;
                }
                .sub-section h6 strong {
                    font-size: 10pt;
                }
                
                /* Content paragraphs */
                .document-content {
                    margin-bottom: 6pt;
                    font-size: 10pt;
                }
                
                /* Bold elements in content */
                .document-content strong {
                    font-size: 10pt;
                }
                
                /* Remove labels like "content:" */
                span[data-value-path] strong:first-child:after {
                    content: " ";
                }
                
                /* Legal clause spacing and indentation */
                .document-line {
                    margin-left: 0 !important;
                }
                
                /* Signature section typically comes near the end */
                .main-section:nth-last-of-type(2) {
                    margin-top: 24pt;
                }
                
                /* Schedule/appendix typically comes last */
                .main-section:last-of-type {
                    page-break-before: always;
                    margin-top: 0;
                }
                
                /* Remove unwanted elements and styling */
                .highlighted, .highlighted-section {
                    background-color: transparent !important;
                    box-shadow: none !important;
                    border-left: none !important;
                    animation: none !important;
                }
                
                /* Additional spacing for signature blocks */
                [data-value-path*="signature"] {
                    margin-top: 12pt;
                    margin-bottom: 12pt;
                }
            </style>
        </head>
        <body>
            ${contentClone.innerHTML}
        </body>
        </html>
    `;

  const converted = htmlDocx.asBlob(html);
  const url = URL.createObjectURL(converted);
  const link = document.createElement("a");
  link.href = url;
  link.download = "document.docx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Helper function to clean up content for DOCX
function cleanupForDocx(element) {
  // 1. Remove any highlighting classes
  const highlighted = element.querySelectorAll('.highlighted, .highlighted-section');
  highlighted.forEach(el => {
    el.classList.remove('highlighted');
    el.classList.remove('highlighted-section');
  });

  // 2. Fix heading format (remove ##### and other markdown-like symbols)
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(heading => {
    heading.textContent = heading.textContent.replace(/^#+\s*/, '');
  });

  // 3. Remove labels like "content:", "option1:", etc.
  const spans = element.querySelectorAll('span[data-value-path]');
  spans.forEach(span => {
    const text = span.textContent;
    const labelMatch = text.match(/^([a-zA-Z0-9]+):\s*(.*)/);
    if (labelMatch && labelMatch[1] &&
        (labelMatch[1].toLowerCase() === 'content' ||
         labelMatch[1].toLowerCase().includes('option'))) {
      span.textContent = labelMatch[2];
    }
  });

  // 4. Set consistent margins and indentation
  const sections = element.querySelectorAll('.document-line');
  sections.forEach(section => {
    section.style.marginLeft = '0';
  });

  // 5. Fix numbering format (add proper indentation for numbered clauses)
  const contentItems = element.querySelectorAll('.document-content');
  contentItems.forEach(item => {
    // Check if this is a numbered clause (like "4.1:", "5.2:", etc.)
    const text = item.textContent;
    const numberMatch = text.match(/^(\d+\.\d+):\s*(.*)/);
    if (numberMatch) {
      item.style.paddingLeft = '0.25in';
      item.style.textIndent = '-0.25in';
    }
  });

  // 6. Apply consistent font sizes
  // Main title
  const titleElements = element.querySelectorAll('.document-title');
  titleElements.forEach(el => {
    el.style.fontSize = '14pt';
    const strongs = el.querySelectorAll('strong');
    strongs.forEach(s => s.style.fontSize = '14pt');
  });

  // Main sections
  const mainSections = element.querySelectorAll('.main-section h5');
  mainSections.forEach(el => {
    el.style.fontSize = '12pt';
    const strongs = el.querySelectorAll('strong');
    strongs.forEach(s => s.style.fontSize = '12pt');
  });

  // Sub-sections and content - all 10pt
  const subSections = element.querySelectorAll('.sub-section h6, .document-content');
  subSections.forEach(el => {
    el.style.fontSize = '10pt';
    const strongs = el.querySelectorAll('strong');
    strongs.forEach(s => s.style.fontSize = '10pt');
  });
}


/* --- Expose functions to global scope --- */
// Add event listeners for text selection
const docPreview = document.getElementById("documentPreview");
if (docPreview) {
  docPreview.addEventListener("mouseup", handleTextSelection);
  docPreview.addEventListener("keyup", handleTextSelection);
}

/**
 * Toggles the edit mode on and off for the document preview
 */
function toggleEditMode() {
  const previewElem = document.getElementById("documentPreview");
  const toggle = document.getElementById("editModeToggle");
  
  if (!previewElem) return;
  
  if (toggle.checked) {
    // Enable editing mode
    previewElem.contentEditable = true;
    previewElem.classList.add("editable");
    // Display a notification
    showNotification("Edit mode enabled. You can now directly edit the document text.");
  } else {
    // Disable editing mode
    previewElem.contentEditable = false;
    previewElem.classList.remove("editable");
    showNotification("Edit mode disabled. Changes made in edit mode remain.");
  }
}

/**
 * Display a temporary notification message
 * @param {string} message - The message to display
 */
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
  
  // Remove the notification after 3 seconds
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transition = "opacity 0.5s";
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 3000);
}


window.openAddKeyValueDialog = openAddKeyValueDialog;
window.closeAddKeyValueDialog = closeAddKeyValueDialog;
window.addKeyValuePair = addKeyValuePair;
window.openAddSubKeyValueDialog = openAddSubKeyValueDialog;
window.closeAddSubKeyValueDialog = closeAddSubKeyValueDialog;
window.addSubKeyValuePair = addSubKeyValuePair;
window.enableEditing = enableEditing;
window.openInsertDialog = openInsertDialog;
window.closeInsertDialog = closeInsertDialog;
window.insertNewContent = insertNewContent;
window.editValue = editValue;
window.saveValue = saveValue;
window.downloadWordDocx = downloadWordDocx;
window.showQuestionnaire = showQuestionnaire;
window.closeQuestionnaireModal = closeQuestionnaireModal;
window.submitQuestionnaire = submitQuestionnaire;
window.handleFieldChange = handleFieldChange;
window.navigateStep = navigateStep;
window.updateValueWithAI = updateValueWithAI;
window.toggleEditMode = toggleEditMode;
// Map form fields to document paths for highlighting
const documentPathMap = {
  // Date field
  effectiveDate: [
    "Consultancy Terms and Conditions.1. Introduction.Effective Date",
  ],

  // Consultant fields
  consultantType: [
    "Consultancy Terms and Conditions.2. Definitions.2.1.Consultant",
  ],
  consultantIndividualName: [
    "Consultancy Terms and Conditions.2. Definitions.2.1.Consultant",
    "Consultancy Terms and Conditions.EXECUTION.signature_blocks.consultant",
  ],
  consultantIndividualAddress: [
    "Consultancy Terms and Conditions.2. Definitions.2.1.Consultant",
  ],
  consultantCompanyName: [
    "Consultancy Terms and Conditions.2. Definitions.2.1.Consultant",
    "Consultancy Terms and Conditions.EXECUTION.signature_blocks.consultant",
  ],
  consultantJurisdiction: [
    "Consultancy Terms and Conditions.2. Definitions.2.1.Consultant",
  ],
  consultantRegistrationNumber: [
    "Consultancy Terms and Conditions.2. Definitions.2.1.Consultant",
  ],
  consultantCompanyAddress: [
    "Consultancy Terms and Conditions.2. Definitions.2.1.Consultant",
  ],
  consultantIdentifyParty: [
    "Consultancy Terms and Conditions.2. Definitions.2.1.Consultant",
  ],
  
  // Client fields
  clientType: [
    "Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.1.content",
  ],
  clientIndividualName: [
    "Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.1.content",
    "Consultancy Terms and Conditions.EXECUTION.signature_blocks.client",
  ],
  clientIndividualAddress: [
    "Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.1.content",
  ],
  clientCompanyName: [
    "Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.1.content",
    "Consultancy Terms and Conditions.EXECUTION.signature_blocks.client",
  ],
  clientRegistrationNumber: [
    "Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.1.content",
  ],
  clientCompanyAddress: [
    "Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.1.content",
  ],

  // Contract details
  term: ["Consultancy Terms and Conditions.3. Term.3.2.content"],
  services: ["Consultancy Terms and Conditions.4. Services.4.2.content"],
  deliverables: ["Consultancy Terms and Conditions.5. Deliverables.5.3.content"],
  charges: ["Consultancy Terms and Conditions.7. Charges.7.2.content"],
  payments: ["Consultancy Terms and Conditions.8. Payments.8.1.content"],
  
  // Statement of work details
  minTerm: [
    "Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.2.content",
  ],
  specificationServices: [
    "Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.3.content",
  ],
  specificationDeliverables: [
    "Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.4.content",
  ],
  timetable: [
    "Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.5.content",
  ],
  clientMaterials: [
    "Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.6.content",
  ],
  financialProvisions: [
    "Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.7.content",
  ],
  consultantNotices: [
    "Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.8.consultant_notices",
  ],
  clientNotices: [
    "Consultancy Terms and Conditions.16. STATEMENT OF WORK.16.8.client_notices",
  ]
};

/**
 * Highlights document sections affected by a specific form field
 * @param {string} fieldId - The ID of the form field being focused
 */
function highlightDocumentSection(fieldId) {
  // Clear any existing highlights first
  clearHighlights();

  console.log(`Highlighting for field: ${fieldId}`);

  // Get the paths this field affects
  const paths = documentPathMap[fieldId];
  if (!paths || paths.length === 0) {
    console.log(`No paths found for ${fieldId}`);
    return;
  }

  console.log(`Found paths for ${fieldId}:`, paths);

  // Find and highlight all elements with matching data-value-path
  const previewElem = document.getElementById("documentPreview");
  let foundAnyElements = false;

  paths.forEach((path) => {
    // First try exact path match
    const elements = previewElem.querySelectorAll(
      `[data-value-path="${path}"]`
    );

    if (elements.length > 0) {
      foundAnyElements = true;
      elements.forEach((elem) => {
        elem.classList.add("highlighted");
        console.log(`Highlighted element with path: ${path}`);
      });
    } else {
      // Try to find parent sections if exact path not found
      const basePathParts = path.split(".");

      // Try increasingly shorter paths
      while (basePathParts.length > 1) {
        basePathParts.pop(); // Remove last segment
        const basePath = basePathParts.join(".");

        if (!basePath) continue;

        const parentElements = previewElem.querySelectorAll(
          `[data-path="${basePath}"]`
        );

        if (parentElements.length > 0) {
          foundAnyElements = true;
          parentElements.forEach((elem) => {
            elem.classList.add("highlighted-section");
            console.log(`Highlighted section with path: ${basePath}`);
          });
          break; // Stop once we find a match
        }
      }
    }
  });

  if (!foundAnyElements) {
    console.log("No elements found to highlight");
    return;
  }

  // Delay scrolling
  setTimeout(() => {
    // Use smart scrolling to select the most relevant highlighted element
    scrollToRelevantHighlight(fieldId);
  }, 50);
}

/**
 * Intelligently scrolls to the most relevant highlighted section
 * Prioritizes client sections when editing client fields
 */
function scrollToRelevantHighlight(fieldId) {
  // Check if this is a client-related field
  const isClientField = fieldId.toLowerCase().includes("client");

  // For client fields, try to find highlighted elements in the statement of work section
  if (isClientField) {
    // First check for direct highlights within STATEMENT OF WORK sections
    const clientHighlight = document.querySelector(
      '.highlighted[data-value-path*="STATEMENT OF WORK"], ' +
        '.highlighted[data-value-path*="client"]'
    );

    if (clientHighlight) {
      clientHighlight.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Then check for section highlights
    const clientSection = document.querySelector(
      '.highlighted-section[data-path*="STATEMENT OF WORK"], ' +
        '.highlighted-section[data-path*="client"]'
    );

    if (clientSection) {
      clientSection.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
  }

  // For non-client fields or if client-specific highlights weren't found
  // First try direct element highlights (most specific)
  const highlightedElement = document.querySelector(".highlighted");

  if (highlightedElement) {
    highlightedElement.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  // Fall back to section highlights
  const highlightedSection = document.querySelector(".highlighted-section");
  if (highlightedSection) {
    highlightedSection.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/**
 * Removes all highlighting from the document preview
 */
function clearHighlights() {
  const previewElem = document.getElementById("documentPreview");
  const highlightedElements = previewElem.querySelectorAll(
    ".highlighted, .highlighted-section"
  );
  highlightedElements.forEach((element) => {
    element.classList.remove("highlighted");
    element.classList.remove("highlighted-section");
  });
}

/**
 * Register event listeners for field highlighting
 */
function registerHighlightEvents() {
  document.querySelectorAll("#keyContainer input, #keyContainer select, #keyContainer textarea").forEach(input => {
    // Focus event (initial click)
    input.addEventListener("focus", function() {
      const fieldId = this.id;
      const originalKey = this.getAttribute("data-original-key");
      
      // For conditional fields (those with prefixes), use the original key for highlighting
      const effectiveId = originalKey || fieldId;
      
      highlightDocumentSection(effectiveId);
    });

    // Add INPUT event to maintain highlighting during editing
    input.addEventListener("input", function() {
      const fieldId = this.id;
      const originalKey = this.getAttribute("data-original-key");
      const effectiveId = originalKey || fieldId;
      
      highlightDocumentSection(effectiveId);
    });

    // Blur event (when leaving the field)
    input.addEventListener("blur", function() {
      setTimeout(() => {
        if (!document.activeElement || 
            (!document.activeElement.id && !document.activeElement.closest("#keyContainer"))) {
          clearHighlights();
        }
      }, 100);
    });
  });
}
