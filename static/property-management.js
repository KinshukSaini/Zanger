// Document order configuration
const sectionOrder = [
  "PARTIES",
  "GENERAL",
  "TERM",
  "THE RESPONSIBILITIES OF THE AGENT",
  "AGENT LIABILITY",
  "PAYMENT AND FEES",
  "TERMINATION",
  "SUCCESSION",
  "GOVERNING LAW",
  "AMENDMENTS",
  "ASSIGNMENT",
  "ALTERNATIVE DISPUTE RESOLUTION",
  "ENTIRE AGREEMENT",
  "SEVERABILITY",
  "SIGNATURE AND DATE"
];

// Document template to store original structure
let documentTemplate = null;

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
    title: "Party Information",
    ownerType: {
      question: "Select type of Owner",
      type: "select",
      options: ["Individual", "Company"],
    },
    ownerName: {
      question: "Enter owner's full name",
      type: "text",
      showIf: "ownerType=Individual",
    },
    ownerCompanyName: {
      question: "Enter company name",
      type: "text",
      showIf: "ownerType=Company",
    },
    ownerAddress: {
      question: "Enter owner's address",
      type: "text",
      showIf: "ownerType=Individual",
    },
    ownerCompanyAddress: {
      question: "Enter company address",
      type: "text",
      showIf: "ownerType=Company",
    },
    agentType: {
      question: "Select type of Agent",
      type: "select",
      options: ["Individual", "Company"],
    },
    agentName: {
      question: "Enter agent's full name",
      type: "text",
      showIf: "agentType=Individual",
    },
    agentCompanyName: {
      question: "Enter agency name",
      type: "text",
      showIf: "agentType=Company",
    },
    agentAddress: {
      question: "Enter agent's address",
      type: "text",
      showIf: "agentType=Individual",
    },
    agentCompanyAddress: {
      question: "Enter agency address",
      type: "text",
      showIf: "agentType=Company",
    },
  },
  step2: {
    title: "Agreement Details",
    date: {
      question: "Enter the effective date of agreement",
      type: "date",
    },
    propertyAddress: {
      question: "Enter the full property address",
      type: "textarea",
      placeholder: "Enter complete property address including street, city, state and ZIP code"
    },
    agreedEndDate: {
      question: "Enter the end date of agreement",
      type: "date",
    },
    repairLimit: {
      question: "Enter repair cost limit without owner approval ($)",
      type: "text",
      placeholder: "e.g., 500"
    },
  },
  step3: {
    title: "Payment Terms",
    paymentTotal: {
      question: "Enter total service cost",
      type: "text",
      placeholder: "e.g., $1,500"
    },
    initialPayment: {
      question: "Enter initial payment amount",
      type: "text",
      placeholder: "e.g., $500"
    },
    finalPayment: {
      question: "Enter final payment amount",
      type: "text",
      placeholder: "e.g., $1,000"
    },
    invoicePeriod: {
      question: "Enter invoice frequency",
      type: "text",
      placeholder: "e.g., 30 days or 1 month"
    },
    paymentMethod: {
      question: "Specify payment method",
      type: "text",
      placeholder: "e.g., Bank transfer, check, etc."
    },
  },
  step4: {
    title: "Legal Terms and Signatures",
    breachPeriod: {
      question: "Enter remedy period for breach (days)",
      type: "text",
      placeholder: "e.g., 14"
    },
    vacancyPeriod: {
      question: "Enter automatic termination period if not rented (days)",
      type: "text",
      placeholder: "e.g., 90"
    },
    governingLaw: {
      question: "Enter governing law jurisdiction",
      type: "text",
      placeholder: "e.g., California"
    },
    disputeResolution: {
      question: "Select dispute resolution method",
      type: "select",
      options: ["Arbitration", "Mediation", "Negotiation"],
    },
    disputeResolutionJurisdiction: {
      question: "Enter dispute resolution jurisdiction",
      type: "text",
      placeholder: "e.g., California"
    },
    ownerSignatureDate: {
      question: "Enter owner's signature date",
      type: "date",
    },
    agentSignatureDate: {
      question: "Enter agent's signature date",
      type: "date",
    }
  },
};

const documentPathMap = {
  // Agreement basics
  "date": ["Property Management Agreement.PARTIES.content"],
  "propertyAddress": ["Property Management Agreement.GENERAL.content"],
  "agreedEndDate": ["Property Management Agreement.TERM.content"],

  // Owner information
  "ownerType": ["Property Management Agreement.PARTIES.content"],
  "ownerName": ["Property Management Agreement.PARTIES.content", "Property Management Agreement.SIGNATURE AND DATE.signature_blocks.owner.name_field"],
  "ownerCompanyName": ["Property Management Agreement.PARTIES.content", "Property Management Agreement.SIGNATURE AND DATE.signature_blocks.owner.name_field"],
  "ownerAddress": ["Property Management Agreement.PARTIES.content"],
  "ownerCompanyAddress": ["Property Management Agreement.PARTIES.content"],
  "ownerSignatureDate": ["Property Management Agreement.SIGNATURE AND DATE.signature_blocks.owner.date_field"],
  
  // Agent information
  "agentType": ["Property Management Agreement.PARTIES.content"],
  "agentName": ["Property Management Agreement.PARTIES.content", "Property Management Agreement.SIGNATURE AND DATE.signature_blocks.agent.name_field"],
  "agentCompanyName": ["Property Management Agreement.PARTIES.content", "Property Management Agreement.SIGNATURE AND DATE.signature_blocks.agent.name_field"],
  "agentAddress": ["Property Management Agreement.PARTIES.content"],
  "agentCompanyAddress": ["Property Management Agreement.PARTIES.content"],
  "agentSignatureDate": ["Property Management Agreement.SIGNATURE AND DATE.signature_blocks.agent.date_field"],
  
  // Agent responsibilities
  "repairLimit": ["Property Management Agreement.THE RESPONSIBILITIES OF THE AGENT.content"],
  
  // Payment and legal terms
  "paymentTotal": ["Property Management Agreement.PAYMENT AND FEES.content"],
  "initialPayment": ["Property Management Agreement.PAYMENT AND FEES.content"],
  "finalPayment": ["Property Management Agreement.PAYMENT AND FEES.content"],
  "invoicePeriod": ["Property Management Agreement.PAYMENT AND FEES.content"],
  "paymentMethod": ["Property Management Agreement.PAYMENT AND FEES.content"],
  "breachPeriod": ["Property Management Agreement.TERMINATION.content"],
  "vacancyPeriod": ["Property Management Agreement.TERMINATION.content"],
  "governingLaw": ["Property Management Agreement.GOVERNING LAW.content"],
  "disputeResolution": ["Property Management Agreement.ALTERNATIVE DISPUTE RESOLUTION.content"],
  "disputeResolutionJurisdiction": ["Property Management Agreement.ALTERNATIVE DISPUTE RESOLUTION.content"]
};

/**
 * Highlights document sections affected by a specific form field
 * and scrolls to the highlighted element after a brief delay
 * @param {string} fieldId - The ID of the form field being focused
 */
function highlightDocumentSection(fieldId) {
  // Clear any existing highlights first
  clearHighlights();

  // Get the paths this field affects
  const paths = documentPathMap[fieldId];
  if (!paths || paths.length === 0) return;

  // Find and highlight all elements with matching data-value-path
  const previewElem = document.getElementById("documentPreview");
  paths.forEach(path => {
    // Find elements with this path
    const elements = previewElem.querySelectorAll(`[data-value-path="${path}"]`);
    if (elements.length === 0) {
      // Try finding parent section if exact path not found
      const basePathParts = path.split('.');
      basePathParts.pop(); // Remove the last part (usually "content")
      const basePath = basePathParts.join('.');
      const parentElements = previewElem.querySelectorAll(`[data-path="${basePath}"]`);

      parentElements.forEach(elem => {
        elem.classList.add("highlighted-section");
      });
    } else {
      elements.forEach(elem => {
        elem.classList.add("highlighted");
      });
    }
  });

  // Delay scrolling by 1ms after highlighting
  setTimeout(() => {
    // Scroll to the first highlighted element
    const firstHighlighted = document.querySelector(".highlighted, .highlighted-section");
    if (firstHighlighted) {
      firstHighlighted.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 1);
}

/**
 * Removes all highlighting from the document preview
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
    window.currentDocument = { "Property Management Agreement": {} };
  }

  try {
    // Initialize the document template
    initializeDocumentTemplate();

    showQuestionnaire();
    // Then initialize the preview
    updatePreview();

    // Register highlighting events after questionnaire is shown
    setTimeout(registerHighlightEvents, 500);

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

        if (subValue && typeof subValue === "object") {
          if (subValue.content !== undefined) {
            html.push(
              `<div class="document-line document-content" data-path="${currentPath}.${subKey}.content" style="margin-left: ${subMarginLeft}px;">
                                <span data-value-path="${currentPath}.${subKey}.content">
                                    <strong>${subKey}:</strong> ${subValue.content}
                                </span>
                            </div>`
            );

            // Handle nested properties for signature blocks
            if (subKey === "signature_blocks" && subValue.owner && subValue.agent) {
              html.push(
                `<div class="document-line document-content" style="margin-left: ${subMarginLeft}px;">
                  <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <tr>
                      <td style="width: 50%; vertical-align: top; padding: 10px; border: 1px solid #ddd;">
                        <strong>OWNER</strong><br>
                        <span data-value-path="${currentPath}.${subKey}.owner.name_field">${subValue.owner.name_field}</span><br>
                        <span data-value-path="${currentPath}.${subKey}.owner.signature_field">${subValue.owner.signature_field}</span><br>
                        <span data-value-path="${currentPath}.${subKey}.owner.date_field">${subValue.owner.date_field}</span>
                      </td>
                      <td style="width: 50%; vertical-align: top; padding: 10px; border: 1px solid #ddd;">
                        <strong>AGENT</strong><br>
                        <span data-value-path="${currentPath}.${subKey}.agent.name_field">${subValue.agent.name_field}</span><br>
                        <span data-value-path="${currentPath}.${subKey}.agent.signature_field">${subValue.agent.signature_field}</span><br>
                        <span data-value-path="${currentPath}.${subKey}.agent.date_field">${subValue.agent.date_field}</span>
                      </td>
                    </tr>
                  </table>
                </div>`
              );
            }
          } else {
            processSection(subKey, subValue, level + 1, currentPath);
          }
        } else {
          html.push(
            `<div class="document-line document-content" data-path="${currentPath}.${subKey}" style="margin-left: ${subMarginLeft}px;">
                            <span>
                                <strong>${subKey}:</strong>
                                <span data-value-path="${currentPath}.${subKey}">${subValue}</span>
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
  // Get the right panel container
  const container = document.getElementById("keyContainer");

  // Update the panel heading
  const panelHeading = container.parentElement.querySelector("h2");

  // Clear existing content
  container.innerHTML = "";

  // Create all steps at once in the container
  let allQuestionsHTML = "";
  for (let stepNumber = 1; stepNumber <= 4; stepNumber++) {
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

  // Add to container
  container.innerHTML = allQuestionsHTML;

  // Add change handlers for real-time updates
  document
    .querySelectorAll(
      "#keyContainer input, #keyContainer select, #keyContainer textarea"
    )
    .forEach((input) => {
      input.addEventListener("input", function () {
        // Store the value with its unique ID
        formDataStore[this.id] = this.value;

        // For type dropdowns, handle specially
        if (this.id === "ownerType" || this.id === "agentType") {
          handlePartyTypeChange(this);
        } else if (this.id === "disputeResolution") {
          handleDisputeResolutionChange(this);
        } else if (this.tagName === "SELECT") {
          handleFieldChange(this);
        } else {
          // Update document in real-time for other inputs
          updateDocumentWithFormData(formDataStore);
          updatePreview();
        }
      });
    });

  // Restore all saved form data
  for (let step = 1; step <= 4; step++) {
    restoreStepData(step);
    registerHighlightEvents();
  }
}

function registerHighlightEvents() {
  document.querySelectorAll("#keyContainer input, #keyContainer select, #keyContainer textarea").forEach(input => {
    // Focus event (initial click)
    input.addEventListener("focus", function() {
      const fieldId = this.id;
      highlightDocumentSection(fieldId);
    });

    // Add INPUT event to maintain highlighting during editing
    input.addEventListener("input", function() {
      const fieldId = this.id;
      highlightDocumentSection(fieldId);
    });

    // Blur event (when leaving the field)
    input.addEventListener("blur", function() {
      setTimeout(() => {
        if (!document.activeElement ||
            !document.activeElement.hasAttribute("data-affects-path")) {
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
      // This is a group of questions
      html += `<div class="question-group" id="${key}-group">`;
      html += createQuestionsHTML(data);
      html += "</div>";
    } else {
      // This is a single question
      html += createQuestionField(key, data);
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
  // Get affected paths for data attribute
  const affectedPaths = documentPathMap[key] ?
      `data-affects-path="${documentPathMap[key].join(',')}"` : "";

  // Handle special cases for the type selectors
  if (key === "ownerType" || key === "agentType") {
    return `
      <select id="${key}" onchange="handlePartyTypeChange(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options
          .map((opt) => `<option value="${opt}">${opt}</option>`)
          .join("")}
      </select>
    `;
  } else if (key === "disputeResolution") {
    return `
      <select id="${key}" onchange="handleDisputeResolutionChange(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options
          .map((opt) => `<option value="${opt}">${opt}</option>`)
          .join("")}
      </select>
    `;
  }

  // Create the appropriate input element
  switch (data.type) {
    case "textarea":
      return `<textarea id="${key}" class="form-textarea" placeholder="${data.placeholder || ''}" ${affectedPaths}></textarea>`;
    case "date":
      return `<input type="date" id="${key}" ${affectedPaths}>`;
    case "select":
      return `
        <select id="${key}" ${affectedPaths}>
          <option value="">Select...</option>
          ${data.options
            .map((opt) => `<option value="${opt}">${opt}</option>`)
            .join("")}
        </select>
      `;
    default:
      return `<input type="text" id="${key}" placeholder="${data.placeholder || ''}" ${affectedPaths}>`;
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
      const showValue = field.getAttribute("data-show-value");
      field.style.display =
        field.dataset.showValue === value ? "block" : "none";
    });

  // Update document based on new field value
  updateDocumentWithFormData(formDataStore);
  updatePreview();
}

function handlePartyTypeChange(selectElement) {
  const isOwner = selectElement.id === "ownerType";
  const isAgent = selectElement.id === "agentType";
  const selectedType = selectElement.value;

  if (!selectedType) return;

  // Clear previous values for other types from formDataStore
  if (isOwner) {
    // Clear owner-related fields that don't match the selected type
    if (selectedType === "Individual") {
      delete formDataStore["ownerCompanyName"];
      delete formDataStore["ownerCompanyAddress"];
    } else if (selectedType === "Company") {
      delete formDataStore["ownerName"];
      delete formDataStore["ownerAddress"];
    }
  } else if (isAgent) {
    // Clear agent-related fields that don't match the selected type
    if (selectedType === "Individual") {
      delete formDataStore["agentCompanyName"];
      delete formDataStore["agentCompanyAddress"];
    } else if (selectedType === "Company") {
      delete formDataStore["agentName"];
      delete formDataStore["agentAddress"];
    }
  }

  // Save the selected type
  formDataStore[selectElement.id] = selectedType;

  // Handle UI field visibility
  document
    .querySelectorAll(`[data-show-if="${selectElement.id}"]`)
    .forEach((field) => {
      const showValue = field.getAttribute("data-show-value");
      field.style.display = showValue === selectedType ? "block" : "none";
    });

  // Update document with the current form data
  updateDocumentWithFormData(formDataStore);
  updatePreview();

  // First, highlight the section affected by this dropdown
  highlightDocumentSection(selectElement.id);

  // Then focus on the first visible field for that party type
  setTimeout(() => {
    // Find all visible input fields for this party type
    const visibleFields = document.querySelectorAll(
      `[data-show-if="${selectElement.id}"][data-show-value="${selectedType}"]:not([style*="display: none"]) input, 
       [data-show-if="${selectElement.id}"][data-show-value="${selectedType}"]:not([style*="display: none"]) textarea`
    );

    // Focus the first one if any exist
    if (visibleFields.length > 0) {
      visibleFields[0].focus();
    }
  }, 200); // Slight delay to ensure DOM is updated
}

function handleDisputeResolutionChange(selectElement) {
  // Save the selected dispute resolution method
  formDataStore[selectElement.id] = selectElement.value;

  // Update document
  updateDocumentWithFormData(formDataStore);
  updatePreview();

  // Highlight the affected section
  highlightDocumentSection(selectElement.id);
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
  // Restore all saved values for this step
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && formDataStore[input.id]) {
      input.value = formDataStore[input.id];

      // Handle conditional field visibility
      if (input.tagName === "SELECT") {
        // For special selectors, use the specific handler
        if (input.id === "ownerType" || input.id === "agentType") {
          handlePartyTypeChange(input);
        } else if (input.id === "disputeResolution") {
          handleDisputeResolutionChange(input);
        } else {
          handleFieldChange(input);
        }
      }
    }
  });
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
  if (!dateStr) return "";
  // Assume dateStr is in format yyyy-mm-dd
  const [year, month, day] = dateStr.split("-");
  
  // Format as MM/DD/YYYY 
  return `${month}/${day}/${year}`;
}

/**
 * Maps form data to document structure
 * @param {Object} flatDoc - Flattened document object
 * @param {Object} formData - The form data
 * @return {Object} Updated flat document
 */
function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };
  const documentTitle =
    Object.keys(window.currentDocument)[0] || "Property Management Agreement";
  
  // PARTIES section
  if (formData.date || formData.ownerName || formData.ownerCompanyName || formData.agentName || formData.agentCompanyName) {
    const partiesKey = `${documentTitle}.PARTIES.content`;
    let partiesContent = "This Property Management Agreement (hereinafter referred to as the \"Agreement\") is entered into on ";
    
    // Add effective date
    if (formData.date) {
      partiesContent += formatDate(formData.date);
    } else {
      partiesContent += "_______________";
    }
    
    partiesContent += " (the \"Effective Date\"), by and between ";
    
    // Add owner info based on owner type
    if (formData.ownerType === "Individual") {
      partiesContent += formData.ownerName || "_________________________";
      partiesContent += ", with an address of ";
      partiesContent += formData.ownerAddress || "__________________";
    } else if (formData.ownerType === "Company") {
      partiesContent += formData.ownerCompanyName || "_________________________";
      partiesContent += ", with an address of ";
      partiesContent += formData.ownerCompanyAddress || "__________________";
    } else {
      partiesContent += "_________________________, with an address of __________________";
    }
    
    partiesContent += " (hereinafter referred to as the \"Owner\"), and ";
    
    // Add agent info based on agent type
    if (formData.agentType === "Individual") {
      partiesContent += formData.agentName || "__________________";
      partiesContent += ", with an address of ";
      partiesContent += formData.agentAddress || "__________________";
    } else if (formData.agentType === "Company") {
      partiesContent += formData.agentCompanyName || "__________________";
      partiesContent += ", with an address of ";
      partiesContent += formData.agentCompanyAddress || "__________________";
    } else {
      partiesContent += "__________________, with an address of __________________";
    }
    
    partiesContent += " (hereinafter referred to as the \"Agent\") (collectively referred to as the \"Parties\").";
    
    updatedFlatDoc[partiesKey] = partiesContent;
  }
  
  // GENERAL section
  if (formData.propertyAddress) {
    const generalKey = `${documentTitle}.GENERAL.content`;
    let generalContent = "Hereby, the Owner exclusively appoints the Agent to manage the property that is located at ";
    
    generalContent += formData.propertyAddress || "___________________________________________________________________________________________________________________________________________________________________________";
    
    generalContent += ". The Agent hereby accepts such responsibility and agrees to manage the property aforementioned. The Owner agrees to pay the fees associated with the services that the Agent will provide when managing the aforementioned property.";
    
    updatedFlatDoc[generalKey] = generalContent;
  }
  
  // TERM section
  if (formData.agreedEndDate) {
    const termKey = `${documentTitle}.TERM.content`;
    let termContent = "This Agreement shall be effective on the date of signing this Agreement (hereinafter referred to as the \"Effective Date\") and will end on ";
    
    if (formData.agreedEndDate) {
      termContent += formatDate(formData.agreedEndDate);
    } else {
      termContent += "________________________________";
    }
    
    termContent += ".";
    
    updatedFlatDoc[termKey] = termContent;
  }
  
  // THE RESPONSIBILITIES OF THE AGENT section
  if (formData.repairLimit) {
    const responsibilitiesKey = `${documentTitle}.THE RESPONSIBILITIES OF THE AGENT.content`;
    let responsibilitiesContent = "To rent and lease as well as operate the property. To collect rent and monies applicable from potential tenants in due time. However, the Agent will not bear the responsibilities of the potential tenants in case of refusal of payment or other. To provide a monthly accounting of rents received and paid expenses as well as any other applicable incomes, monies or sums to the Owner. To decorate, improve, repair and maintain the property when needed. To hire as well as supervise employees (if any) when needed. To inform the Owner of any improvements and repairs that exceed ";
    
    responsibilitiesContent += formData.repairLimit || "_________________";
    
    responsibilitiesContent += " and to obtain consent from the Owner prior to paying such fees.";
    
    updatedFlatDoc[responsibilitiesKey] = responsibilitiesContent;
  }
  
  // PAYMENT AND FEES section
  if (formData.paymentTotal || formData.initialPayment || formData.finalPayment || formData.invoicePeriod || formData.paymentMethod) {
    const paymentKey = `${documentTitle}.PAYMENT AND FEES.content`;
    let paymentContent = "The Parties agree that the total cost of the services will be ";
    
    paymentContent += formData.paymentTotal || "_________________";
    
    paymentContent += ", where ";
    
    paymentContent += formData.initialPayment || "______________";
    
    paymentContent += " will be paid at the signing of this Agreement and ";
    
    paymentContent += formData.finalPayment || "______________";
    
    paymentContent += " will be paid at completion. The Parties agree that the Agent will provide an invoice to the Owner every ";
    
    paymentContent += formData.invoicePeriod || "______________";
    
    if (!formData.invoicePeriod) {
      paymentContent += " days/months";
    }
    
    paymentContent += " for the Services he/she completes. The Parties agree that the means of payment will be via ";
    
    paymentContent += formData.paymentMethod || "___________________________________________________________________________________________________________________________________________________________________________";
    
    paymentContent += ".";
    
    updatedFlatDoc[paymentKey] = paymentContent;
  }
  
  // TERMINATION section
  if (formData.breachPeriod || formData.vacancyPeriod) {
    const terminationKey = `${documentTitle}.TERMINATION.content`;
    let terminationContent = "This Agreement may be terminated in case the following occurs: Immediately in case one of the Parties breaches this Agreement or one of the conditions set forth in this Agreement and does not amend the issue within a period of ";
    
    terminationContent += formData.breachPeriod || "__________________";
    
    terminationContent += ". This Agreement will automatically be terminated in case the premises is not rented in a period of ";
    
    terminationContent += formData.vacancyPeriod || "_________________";
    
    terminationContent += " from the date of signing this Agreement.";
    
    updatedFlatDoc[terminationKey] = terminationContent;
  }
  
  // GOVERNING LAW section
  if (formData.governingLaw) {
    const lawKey = `${documentTitle}.GOVERNING LAW.content`;
    let lawContent = "This Agreement shall be governed by and construed in accordance with the laws of ";
    
    lawContent += formData.governingLaw || "_________________";
    
    lawContent += ".";
    
    updatedFlatDoc[lawKey] = lawContent;
  }
  
  // ALTERNATIVE DISPUTE RESOLUTION section
  if (formData.disputeResolution || formData.disputeResolutionJurisdiction) {
    const adrKey = `${documentTitle}.ALTERNATIVE DISPUTE RESOLUTION.content`;
    let adrContent = "Any dispute or difference whatsoever arising out of or in connection with this Agreement shall be submitted to ";
    
    // Use the selected dispute resolution method or placeholder
    if (formData.disputeResolution) {
      adrContent += formData.disputeResolution;
    } else {
      adrContent += "_________________ (Arbitration/mediation/negotiation) (Circle one)";
    }
    
    adrContent += " in accordance with, and subject to the laws of, ";
    
    adrContent += formData.disputeResolutionJurisdiction || "_________________";
    
    adrContent += ".";
    
    updatedFlatDoc[adrKey] = adrContent;
  }
  
  // SIGNATURE AND DATE section (name and date fields)
  // Owner signature
  if (formData.ownerType === "Individual" && formData.ownerName) {
    const ownerNameKey = `${documentTitle}.SIGNATURE AND DATE.signature_blocks.owner.name_field`;
    updatedFlatDoc[ownerNameKey] = `Name: ${formData.ownerName}`;
  } else if (formData.ownerType === "Company" && formData.ownerCompanyName) {
    const ownerNameKey = `${documentTitle}.SIGNATURE AND DATE.signature_blocks.owner.name_field`;
    updatedFlatDoc[ownerNameKey] = `Name: ${formData.ownerCompanyName}`;
  }
  
  // Owner signature date
  if (formData.ownerSignatureDate) {
    const ownerDateKey = `${documentTitle}.SIGNATURE AND DATE.signature_blocks.owner.date_field`;
    updatedFlatDoc[ownerDateKey] = `Date: ${formatDate(formData.ownerSignatureDate)}`;
  }
  
  // Owner signature field (always keep this as placeholder)
  const ownerSigKey = `${documentTitle}.SIGNATURE AND DATE.signature_blocks.owner.signature_field`;
  updatedFlatDoc[ownerSigKey] = `Signature:_______________________________`;
  
  // Agent signature
  if (formData.agentType === "Individual" && formData.agentName) {
    const agentNameKey = `${documentTitle}.SIGNATURE AND DATE.signature_blocks.agent.name_field`;
    updatedFlatDoc[agentNameKey] = `Name: ${formData.agentName}`;
  } else if (formData.agentType === "Company" && formData.agentCompanyName) {
    const agentNameKey = `${documentTitle}.SIGNATURE AND DATE.signature_blocks.agent.name_field`;
    updatedFlatDoc[agentNameKey] = `Name: ${formData.agentCompanyName}`;
  }
  
  // Agent signature date
  if (formData.agentSignatureDate) {
    const agentDateKey = `${documentTitle}.SIGNATURE AND DATE.signature_blocks.agent.date_field`;
    updatedFlatDoc[agentDateKey] = `Date: ${formatDate(formData.agentSignatureDate)}`;
  }
  
  // Agent signature field (always keep this as placeholder)
  const agentSigKey = `${documentTitle}.SIGNATURE AND DATE.signature_blocks.agent.signature_field`;
  updatedFlatDoc[agentSigKey] = `Signature:_______________________________`;

  return updatedFlatDoc;
}

// Main function for updating document with form data (using flatten/unflatten approach)
function updateDocumentWithFormData(formData) {
  // Get a clean template
  const templateDoc = getDocumentTemplate();

  // Flatten the template
  const flatTemplate = flattenObject(templateDoc);

  // Apply form data to the flat document
  const updatedFlatDoc = applyFormDataToFlatDocument(flatTemplate, formData);

  // Unflatten back to the original structure
  const updatedDoc = unflattenObject(updatedFlatDoc);

  // Update the current document
  window.currentDocument = updatedDoc;

  console.log("Updated document with form data:", window.currentDocument);
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

/* --- Get Ordered Paths for Key Editor --- */
function getOrderedPaths(obj) {
  let paths = [];
  const documentTitle = Object.keys(obj)[0];
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
        } else if (key === "signature_blocks") {
          // Handle signature blocks
          if (value.owner) {
            Object.entries(value.owner).forEach(([fieldKey, fieldValue]) => {
              paths.push({
                path: `${currentPath}.${key}.owner.${fieldKey}`,
                value: fieldValue,
              });
            });
          }
          if (value.agent) {
            Object.entries(value.agent).forEach(([fieldKey, fieldValue]) => {
              paths.push({
                path: `${currentPath}.${key}.agent.${fieldKey}`,
                value: fieldValue,
              });
            });
          }
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
    const html = convertToHtml(window.currentDocument);
    previewElem.innerHTML = html;
  } catch (error) {
    console.error("Error updating preview:", error);
    previewElem.innerHTML =
      '<div class="error">Error loading document preview</div>';
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
                <button class="btn btn-edit ai-button" onclick="updateValueWithAI('${path}')">Get AI Suggestion</button>
                <button class="btn btn-edit edit-button" onclick="editValue('${path}')">Edit</button>
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
  saveButton.disabled = false;
}

/* --- Utility Functions --- */
function splitPath(path) {
  let parts = path.split(".");
  return parts.map(part => part.trim());
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
    const pathParts = splitPath(path);
    let current = window.currentDocument;

    for (let i = 0; i < pathParts.length - 1; i++) {
      let part = pathParts[i].replace(/\["(.*)"\]/, "$1");
      if (!current[part]) current[part] = {};
      current = current[part];
    }

    let lastPart = pathParts[pathParts.length - 1].replace(/\["(.*)"\]/, "$1");
    current[lastPart] = newValue;

    // Update the preview display
    updatePreview();
    
    // Highlight the updated section
    highlightDocumentSection(path);

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

    const currentValueInput = document.querySelector(
      `input[data-key="${path}"]`
    );
    if (currentValueInput) {
      currentValueInput.value = newValue;
      currentValueInput.readOnly = true;
      currentValueInput.setAttribute("data-original-value", newValue);
    }

    const suggestionInput = document.querySelector(
      `input[data-ai-suggestion="${path}"]`
    );
    if (suggestionInput) {
      suggestionInput.value = "";
    }

    const saveButton = document.querySelector(
      `button.save-button[onclick="saveValue('${path}')"]`
    );
    if (saveButton) {
      saveButton.disabled = true;
    }

    if (aiButton) aiButton.style.display = "";
    if (editButton) editButton.style.display = "";

    const successDiv = document.getElementById(`success-${path}`);
    if (successDiv) {
      successDiv.textContent = "Changes saved successfully";
      successDiv.style.display = "block";
      setTimeout(() => {
        successDiv.style.display = "none";
      }, 3000);
    }

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

/* --- Download Function --- */
function downloadWordDocx() {
  const content = document.getElementById("documentPreview").innerHTML;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Property Management Agreement</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #333;
          margin: 1in;
        }
        h5 {
          font-size: 14pt;
          font-weight: bold;
          margin-top: 20pt;
          margin-bottom: 10pt;
          text-transform: uppercase;
        }
        .document-line {
          margin-bottom: 10pt;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20pt;
        }
        td {
          border: 1px solid #ddd;
          padding: 10pt;
          vertical-align: top;
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
  link.download = "Property_Management_Agreement.docx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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


window.enableEditing = enableEditing;
window.openInsertDialog = openInsertDialog;
window.closeInsertDialog = closeInsertDialog;
window.insertNewContent = insertNewContent;
window.editValue = editValue;
window.saveValue = saveValue;
window.downloadWordDocx = downloadWordDocx;
window.showQuestionnaire = showQuestionnaire;
window.submitQuestionnaire = submitQuestionnaire;
window.handleFieldChange = handleFieldChange;
window.handlePartyTypeChange = handlePartyTypeChange;
window.handleDisputeResolutionChange = handleDisputeResolutionChange;
window.updateValueWithAI = updateValueWithAI;
window.highlightDocumentSection = highlightDocumentSection;
window.clearHighlights = clearHighlights;
window.closeEditDialog = closeEditDialog;
window.toggleEditMode = toggleEditMode;