// Document order configuration
const sectionOrder = [
  "DATE",
  "PARTIES",
  "AGREEMENT",
  "EXECUTION"
];

const agreementSectionOrder = [
  "2. Definitions",
  "3. Term",
  "4. Consideration",
  "5. Recipient confidentiality obligations",
  "6. Termination",
  "7. Effects of termination",
  "8. Equitable relief",
  "9. General"
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
    title: "Date and Party Type",
    date: {
      question: "Enter the date of agreement",
      type: "date",
    },
  },
  step2: {
    title: "Disclosor Details",
    disclosorType: {
      question: "Select type of Disclosor",
      type: "select",
      options: ["Individual", "Company"],
    },
    individual: {
      name: {
        question: "Enter individual's full name",
        type: "text",
        showIf: "disclosorType=Individual",
      },
      address: {
        question: "Enter individual's address",
        type: "text",
        showIf: "disclosorType=Individual",
      },
    },
    company: {
      name: {
        question: "Enter company name",
        type: "text",
        showIf: "disclosorType=Company",
      },
      regNumber: {
        question: "Enter registration number",
        type: "text",
        showIf: "disclosorType=Company",
      },
      jurisdiction: {
        question: "Enter jurisdiction of incorporation",
        type: "text",
        showIf: "disclosorType=Company",
      },
      address: {
        question: "Enter registered office address",
        type: "text",
        showIf: "disclosorType=Company",
      },
      signatory: {
        question: "Enter name of person signing on behalf of company",
        type: "text",
        showIf: "disclosorType=Company",
      },
    }
  },
  step3: {
    title: "Recipient Details",
    recipientType: {
      question: "Select type of Recipient",
      type: "select",
      options: ["Individual", "Company"],
    },
    individual: {
      name: {
        question: "Enter individual's full name",
        type: "text",
        showIf: "recipientType=Individual",
      },
      address: {
        question: "Enter individual's address",
        type: "text",
        showIf: "recipientType=Individual",
      },
    },
    company: {
      name: {
        question: "Enter company name",
        type: "text",
        showIf: "recipientType=Company",
      },
      regNumber: {
        question: "Enter registration number",
        type: "text",
        showIf: "recipientType=Company",
      },
      jurisdiction: {
        question: "Enter jurisdiction of incorporation",
        type: "text",
        showIf: "recipientType=Company",
      },
      address: {
        question: "Enter registered office address",
        type: "text",
        showIf: "recipientType=Company",
      },
      signatory: {
        question: "Enter name of person signing on behalf of company",
        type: "text",
        showIf: "recipientType=Company",
      },
    }
  },
  step4: {
    title: "Agreement Details",
    consideration: {
      question: "Enter the consideration amount (if monetary)",
      type: "text",
    },
    term: {
      question: "Select the term type for the agreement",
      type: "select",
      options: ["Indefinite", "Specific Date", "Specific Event"]
    },
    termDate: {
      question: "Enter the specific termination date",
      type: "date",
      showIf: "term=Specific Date"
    },
    termEvent: {
      question: "Describe the termination event",
      type: "text",
      showIf: "term=Specific Event"
    },
    jurisdiction: {
      question: "Enter governing law jurisdiction (e.g., England)",
      type: "text"
    },
    purposes: {
      question: "Specify permitted purposes for use of confidential information (optional)",
      type: "textarea",
    },
  },
};

const documentPathMap = {
  // Date field
  "date": ["Non-disclosure agreement.DATE.content"],

  // Disclosor fields
  "disclosorType": ["Non-disclosure agreement.PARTIES.1.content"],
  
  // Disclosor fields (Individual)
  "disclosor_individual_name": ["Non-disclosure agreement.PARTIES.1.content", "Non-disclosure agreement.EXECUTION.signature_blocks.disclosor"],
  "disclosor_individual_address": ["Non-disclosure agreement.PARTIES.1.content"],

  // Disclosor fields (Company)
  "disclosor_company_name": ["Non-disclosure agreement.PARTIES.1.content", "Non-disclosure agreement.EXECUTION.signature_blocks.disclosor"],
  "disclosor_company_regNumber": ["Non-disclosure agreement.PARTIES.1.content"],
  "disclosor_company_jurisdiction": ["Non-disclosure agreement.PARTIES.1.content"],
  "disclosor_company_address": ["Non-disclosure agreement.PARTIES.1.content"],
  "disclosor_company_signatory": ["Non-disclosure agreement.EXECUTION.signature_blocks.disclosor"],

  // Recipient fields
  "recipientType": ["Non-disclosure agreement.PARTIES.2.content"],
  
  // Recipient fields (Individual)
  "recipient_individual_name": ["Non-disclosure agreement.PARTIES.2.content", "Non-disclosure agreement.EXECUTION.signature_blocks.recipient"],
  "recipient_individual_address": ["Non-disclosure agreement.PARTIES.2.content"],

  // Recipient fields (Company)
  "recipient_company_name": ["Non-disclosure agreement.PARTIES.2.content", "Non-disclosure agreement.EXECUTION.signature_blocks.recipient"],
  "recipient_company_regNumber": ["Non-disclosure agreement.PARTIES.2.content"],
  "recipient_company_jurisdiction": ["Non-disclosure agreement.PARTIES.2.content"],
  "recipient_company_address": ["Non-disclosure agreement.PARTIES.2.content"],
  "recipient_company_signatory": ["Non-disclosure agreement.EXECUTION.signature_blocks.recipient"],

  // Agreement details
  "consideration": ["Non-disclosure agreement.AGREEMENT.4. Consideration.4.1.content"],
  "term": ["Non-disclosure agreement.AGREEMENT.3. Term.3.2.content"],
  "termDate": ["Non-disclosure agreement.AGREEMENT.3. Term.3.2.content"],
  "termEvent": ["Non-disclosure agreement.AGREEMENT.3. Term.3.2.content"],
  "jurisdiction": ["Non-disclosure agreement.AGREEMENT.9. General.9.8.content", "Non-disclosure agreement.AGREEMENT.9. General.9.9.content"],
  "purposes": ["Non-disclosure agreement.AGREEMENT.5. Recipient confidentiality obligations.5.1.e"]
};

// 2. Create highlighting functions - Add these after the documentPathMap

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
    window.currentDocument = { "Non-disclosure agreement": {} };
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
      if (key === "AGREEMENT") {
        const actualKeys = Object.keys(value);
        keys = agreementSectionOrder
          .filter((k) => actualKeys.includes(k))
          .concat(
            actualKeys.filter((k) => !agreementSectionOrder.includes(k))
          );
      }

      keys.forEach((subKey) => {
        const subValue = value[subKey];
        const subMarginLeft = marginLeft + 40;

// In the processSection function within convertToHtml
if (subValue && typeof subValue === "object") {
  if (subValue.content !== undefined) {
    html.push(
      `<div class="document-line document-content" data-path="${currentPath}.${subKey}.content" style="margin-left: ${subMarginLeft}px;">
        <span data-value-path="${currentPath}.${subKey}.content">
          <strong>${subKey}:</strong> ${subValue.content}
        </span>
      </div>`
    );

    // Add this block to handle nested properties when there's content
    const nestedKeys = Object.keys(subValue).filter(k => k !== 'content');
    if (nestedKeys.length > 0) {
      nestedKeys.forEach(nestedKey => {
        const nestedValue = subValue[nestedKey];
        html.push(
          `<div class="document-line document-content" data-path="${currentPath}.${subKey}.${nestedKey}" style="margin-left: ${subMarginLeft + 20}px;">
            <span data-value-path="${currentPath}.${subKey}.${nestedKey}">
              <strong>${nestedKey}:</strong> ${nestedValue}
            </span>
          </div>`
        );
      });
    }
  } else {
    processSection(subKey, subValue, level + 1, currentPath);
  }
}
else {
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
  // Get the right panel container instead of modal
  const container = document.getElementById("keyContainer");

  // DON'T modify the heading if there's already a save button
  const panelHeading = container.parentElement.querySelector("h2");
  const existingSaveButton = container.parentElement.querySelector("#saveDocBtn");

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

        // For party type dropdowns, handle specially
        if (this.id === "disclosorType" || this.id === "recipientType" || this.id === "term") {
          handlePartyTypeChange(this);
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

function createQuestionStep(stepNumber) {
  const stepData = documentQuestions[`step${stepNumber}`];
  const container = document.getElementById("questionsContainer");

  container.innerHTML = `
        <h4>${stepData.title}</h4>
        <div class="step-content">
            ${createQuestionsHTML(stepData)}
        </div>
        <div class="step-navigation">
            ${
              stepNumber > 1
                ? '<button class="btn btn-edit" onclick="navigateStep(' +
                  (stepNumber - 1) +
                  ')">Previous</button>'
                : ""
            }
            ${
              stepNumber < 4
                ? '<button class="btn btn-edit" onclick="navigateStep(' +
                  (stepNumber + 1) +
                  ')">Next</button>'
                : '<button class="btn btn-add" onclick="submitQuestionnaire()">Submit</button>'
            }
        </div>
    `;

  // Restore any previously saved data
  restoreStepData(stepNumber);
}

function createQuestionsHTML(stepData) {
  let html = "";

  // Add section identifier classes
  const isDisclosorSection =
    stepData.title && stepData.title.includes("Disclosor");
  const isRecipientSection =
    stepData.title && stepData.title.includes("Recipient");
  const sectionClass = isDisclosorSection
    ? "disclosor-section"
    : isRecipientSection
    ? "recipient-section"
    : "";

  for (const [key, data] of Object.entries(stepData)) {
    if (key === "title") continue;

    if (typeof data === "object" && !data.type) {
      // This is a group of questions - add section class
      const groupClass = isDisclosorSection
        ? "disclosor-group"
        : isRecipientSection
        ? "recipient-group"
        : "";

      html += `<div class="question-group ${groupClass}" id="${key}-group">`;
      html += createQuestionsHTML(data);
      html += "</div>";
    } else {
      // This is a single question
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
  // Determine which section and type we're in
  let prefix = "";

  // Extract context from showIf
  const dataShowIf = data.showIf || "";
  if (dataShowIf.includes("disclosorType=")) {
    const type = dataShowIf.split("=")[1].toLowerCase();
    prefix = `disclosor_${type}_`;
  } else if (dataShowIf.includes("recipientType=")) {
    const type = dataShowIf.split("=")[1].toLowerCase();
    prefix = `recipient_${type}_`;
  } else if (key === "disclosorType" || key === "recipientType" || key === "term") {
    // No prefix for the type selectors themselves
    prefix = "";
  }

  // Create full ID
  const fullId = prefix ? prefix + key : key;

  // Get affected paths for data attribute
  const affectedPaths = documentPathMap[fullId] ?
      `data-affects-path="${documentPathMap[fullId].join(',')}"` : "";

  // Handle special cases for the type selectors themselves
  if (key === "disclosorType" || key === "recipientType") {
    return `
      <select id="${key}" onchange="handlePartyTypeChange(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options
          .map((opt) => `<option value="${opt}">${opt}</option>`)
          .join("")}
      </select>
    `;
  } else if (key === "term") {
    return `
      <select id="${key}" onchange="handleTermTypeChange(this)" ${affectedPaths}>
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
      return `<textarea id="${fullId}" class="form-textarea" data-original-key="${key}" ${affectedPaths}></textarea>`;
    case "date":
      return `<input type="date" id="${fullId}" data-original-key="${key}" ${affectedPaths}>`;
    case "select":
      return `
        <select id="${fullId}" data-original-key="${key}" ${affectedPaths}>
          <option value="">Select...</option>
          ${data.options
            .map((opt) => `<option value="${opt}">${opt}</option>`)
            .join("")}
        </select>
      `;
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
  // Restore all saved values for this step
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && formDataStore[input.id]) {
      input.value = formDataStore[input.id];

      // Handle conditional field visibility
      if (input.tagName === "SELECT") {
        // For party type selectors, use the specific handler
        if (input.id === "disclosorType" || input.id === "recipientType") {
          handlePartyTypeChange(input);
        } else if (input.id === "term") {
          handleTermTypeChange(input);
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

// Simplified handlePartyTypeChange function
function handlePartyTypeChange(selectElement) {
  const isDisclosor = selectElement.id === "disclosorType";
  const isRecipient = selectElement.id === "recipientType";
  const selectedType = selectElement.value;

  if (!selectedType) return;

  // Clear previous values for other types from formDataStore
  const prefix = isDisclosor ? "disclosor_" : "recipient_";
  const allPartyTypes = ["individual", "company"];

  // Remove form data for other party types
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

  // Add highlighting functionality
  // First, highlight the section affected by this dropdown
  highlightDocumentSection(selectElement.id);

  // Then focus on the first visible field for that party type
  setTimeout(() => {
    // Find all visible input fields for this party type
    const visibleFields = document.querySelectorAll(
      `[data-show-if="${selectElement.id}"][data-show-value="${selectedType}"]:not([style*="display: none"]) input, 
       [data-show-if="${selectElement.id}"][data-show-value="${selectedType}"]:not([style*="display: none"]) textarea,
       [data-show-if="${selectElement.id}"][data-show-value="${selectedType}"]:not([style*="display: none"]) select`
    );

    // Focus the first one if any exist
    if (visibleFields.length > 0) {
      visibleFields[0].focus();
    }
  }, 200); // Slight delay to ensure DOM is updated
}

function handleTermTypeChange(selectElement) {
  const selectedType = selectElement.value;

  if (!selectedType) return;

  // Save the selected type
  formDataStore[selectElement.id] = selectedType;

  // Handle UI field visibility
  document
    .querySelectorAll(`[data-show-if="term"]`)
    .forEach((field) => {
      const showValue = field.getAttribute("data-show-value");
      field.style.display = showValue === selectedType ? "block" : "none";
    });

  // Update document with the current form data
  updateDocumentWithFormData(formDataStore);
  updatePreview();

  // Highlight the section affected by this dropdown
  highlightDocumentSection(selectElement.id);
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
    Object.keys(window.currentDocument)[0] || "Non-disclosure agreement";

  // Format date if provided
  if (formData.date) {
    const formattedDate = formatDate(formData.date);
    const dateKey = `${documentTitle}.DATE.content`;
    updatedFlatDoc[dateKey] = formattedDate;
  }

  // Update Disclosor information (Party 1)
  if (formData.disclosorType) {
    const party1Key = `${documentTitle}.PARTIES.1.content`;
    let party1Content = "";

    if (formData.disclosorType === "Individual") {
      const name = formData.disclosor_individual_name || "*[INDIVIDUAL NAME]*";
      const address = formData.disclosor_individual_address || "*[address]*";
      party1Content = `${name} of ${address}`;
    } else if (formData.disclosorType === "Company") {
      const name = formData.disclosor_company_name || "*[COMPANY NAME]*";
      const regNumber = formData.disclosor_company_regNumber || "*[number]*";
      const jurisdiction = formData.disclosor_company_jurisdiction || "*[jurisdiction]*";
      const address = formData.disclosor_company_address || "*[address]*";
      party1Content = `${name}, a company incorporated in ${jurisdiction} (registration number ${regNumber}) having its registered office at ${address}`;
    }

    if (party1Content) {
      updatedFlatDoc[party1Key] = party1Content + ' ("the Disclosor")';
    }
  }

  // Update Recipient information (Party 2)
  if (formData.recipientType) {
    const party2Key = `${documentTitle}.PARTIES.2.content`;
    let party2Content = "";

    if (formData.recipientType === "Individual") {
      const name = formData.recipient_individual_name || "*[INDIVIDUAL NAME]*";
      const address = formData.recipient_individual_address || "*[address]*";
      party2Content = `${name} of ${address}`;
    } else if (formData.recipientType === "Company") {
      const name = formData.recipient_company_name || "*[COMPANY NAME]*";
      const regNumber = formData.recipient_company_regNumber || "*[registration number]*";
      const jurisdiction = formData.recipient_company_jurisdiction || "*[jurisdiction]*";
      const address = formData.recipient_company_address || "*[address]*";
      party2Content = `${name}, a company incorporated in ${jurisdiction} (registration number ${regNumber}) having its registered office at ${address}`;
    }

    if (party2Content) {
      updatedFlatDoc[party2Key] = party2Content + ' ("the Recipient")';
    }
  }

  // Update Term (3.2)
  if (formData.term) {
    const termKey = `${documentTitle}.AGREEMENT.3. Term.3.2.content`;
    let termContent = "This Agreement shall continue in force ";
    
    if (formData.term === "Indefinite") {
      termContent += "indefinitely";
    } else if (formData.term === "Specific Date" && formData.termDate) {
      const formattedTermDate = formatDate(formData.termDate);
      termContent += `until ${formattedTermDate}, at the beginning of which this Agreement shall terminate automatically`;
    } else if (formData.term === "Specific Event" && formData.termEvent) {
      termContent += `until ${formData.termEvent}, upon which this Agreement shall terminate automatically`;
    } else {
      termContent += "[indefinitely] OR [until *[date]*, at the beginning of which this Agreement shall terminate automatically] OR [until *[event]*, upon which this Agreement shall terminate automatically]";
    }
    
    termContent += ", subject to termination in accordance with Clause 6 or any other provision of this Agreement.";
    updatedFlatDoc[termKey] = termContent;
  }

  // Update Consideration
  if (formData.consideration) {
    const considerationKey = `${documentTitle}.AGREEMENT.4. Consideration.4.1.content`;
    updatedFlatDoc[
      considerationKey
    ] = `The Recipient has entered into this Agreement, and agrees to the provisions of this Agreement, in consideration for the payment by the Disclosor to the Recipient of the sum of ${formData.consideration}, receipt of which the Recipient now acknowledges`;
  }

  // Update Purposes
  if (formData.purposes) {
    const purposesKey = `${documentTitle}.AGREEMENT.5. Recipient confidentiality obligations.5.1.e`;
    updatedFlatDoc[purposesKey] = `[not use or allow the use of any of the Disclosor Confidential Information for any purpose other than ${formData.purposes}]`;
  }

  // Update Jurisdiction
  if (formData.jurisdiction) {
    const jurisdictionKey1 = `${documentTitle}.AGREEMENT.9. General.9.8.content`;
    const jurisdictionKey2 = `${documentTitle}.AGREEMENT.9. General.9.9.content`;
    
    updatedFlatDoc[jurisdictionKey1] = `This Agreement shall be governed by and construed in accordance with [${formData.jurisdiction} law]`;
    updatedFlatDoc[jurisdictionKey2] = `The courts of [${formData.jurisdiction}] shall have exclusive jurisdiction to adjudicate any dispute arising under or in connection with this Agreement`;
  }

  // Update Execution (signature blocks)
  if (formData.disclosorType) {
    const disclosorSigKey = `${documentTitle}.EXECUTION.signature_blocks.disclosor`;
    let signatureContent = "";

    if (formData.disclosorType === "Individual") {
      const name = formData.disclosor_individual_name || "*[individual name]*";
      signatureContent = `SIGNED BY ${name} on [.........], the Disclosor`;
    } else if (formData.disclosorType === "Company") {
      const name = formData.disclosor_company_name || "*[COMPANY NAME]*";
      const signatory = formData.disclosor_company_signatory || "*[individual name]*";
      signatureContent = `SIGNED BY ${signatory} on [.........], duly authorised for and on behalf of ${name}`;
    }

    if (signatureContent) {
      updatedFlatDoc[disclosorSigKey] = signatureContent;
    }
  }

  if (formData.recipientType) {
    const recipientSigKey = `${documentTitle}.EXECUTION.signature_blocks.recipient`;
    let signatureContent = "";

    if (formData.recipientType === "Individual") {
      const name = formData.recipient_individual_name || "*[individual name]*";
      signatureContent = `SIGNED BY ${name} on [.........], the Recipient`;
    } else if (formData.recipientType === "Company") {
      const name = formData.recipient_company_name || "*[COMPANY NAME]*";
      const signatory = formData.recipient_company_signatory || "*[individual name]*";
      signatureContent = `SIGNED BY ${signatory} on [.........], duly authorised for and on behalf of ${name}`;
    }

    if (signatureContent) {
      updatedFlatDoc[recipientSigKey] = signatureContent;
    }
  }

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

/* --- Functions for Adding Key-Value Pair under AGREEMENT --- */
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
  if (
    !window.currentDocument[documentTitle] ||
    !window.currentDocument[documentTitle]["AGREEMENT"]
  ) {
    if (!window.currentDocument[documentTitle]) {
      window.currentDocument[documentTitle] = {};
    }
    window.currentDocument[documentTitle]["AGREEMENT"] = {};
  }

  window.currentDocument[documentTitle]["AGREEMENT"][key] = { content: value };
  updatePreview();
  updateKeyEditor();

  document.getElementById("newKVKey").value = "";
  document.getElementById("newKVValue").value = "";
  closeAddKeyValueDialog();
}

// Functions for Adding Sub Key-Value Pair
function openAddSubKeyValueDialog() {
  const parentKeySelect = document.getElementById("parentKeySelect");
  parentKeySelect.innerHTML = "";

  const documentTitle = Object.keys(window.currentDocument)[0];
  if (
    window.currentDocument[documentTitle] &&
    window.currentDocument[documentTitle]["AGREEMENT"]
  ) {
    const agreementObj = window.currentDocument[documentTitle]["AGREEMENT"];
    Object.keys(agreementObj).forEach(function (key) {
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
  if (
    !window.currentDocument[documentTitle] ||
    !window.currentDocument[documentTitle]["AGREEMENT"]
  ) {
    alert("AGREEMENT section does not exist.");
    return;
  }

  const agreementObj = window.currentDocument[documentTitle]["AGREEMENT"];
  if (!agreementObj[parentKey]) {
    agreementObj[parentKey] = {};
  }

  agreementObj[parentKey][subKey] = { content: subValue };
  updatePreview();
  updateKeyEditor();

  document.getElementById("subKey").value = "";
  document.getElementById("subValue").value = "";
  closeAddSubKeyValueDialog();
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
    if (currentPath.endsWith("AGREEMENT")) {
      const actualKeys = Object.keys(section);
      keys = agreementSectionOrder
        .filter((k) => actualKeys.includes(k))
        .concat(actualKeys.filter((k) => !agreementSectionOrder.includes(k)));
    }

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
        const isDateOrParties =
          path.startsWith("Non-disclosure agreement.DATE") ||
          path.startsWith("Non-disclosure agreement.PARTIES");

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
                                  isDateOrParties
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
  if (
    path.startsWith("Non-disclosure agreement.DATE") ||
    path.startsWith("Non-disclosure agreement.PARTIES")
  ) {
    saveButton.disabled = false;
  }
}

/* --- Utility Functions --- */
function splitPath(path) {
  let parts = path.split(".");
  const specialIndex = parts.findIndex((token) => token.trim() === "PARTIES");
  if (specialIndex === -1) {
    return mergeWithRules(parts);
  }
  const leftParts = parts.slice(0, specialIndex);
  const mergedLeft = mergeWithRules(leftParts);
  const rightParts = parts.slice(specialIndex).map((t) => t.trim());
  return mergedLeft.concat(rightParts);
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
window.handleTermTypeChange = handleTermTypeChange;
window.navigateStep = navigateStep;
window.updateValueWithAI = updateValueWithAI;
window.highlightDocumentSection = highlightDocumentSection;
window.clearHighlights = clearHighlights;
window.handlePartyTypeChange = handlePartyTypeChange;
window.closeEditDialog = closeEditDialog;
window.toggleEditMode = toggleEditMode;