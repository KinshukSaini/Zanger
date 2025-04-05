// Commission agreement order configuration
const sectionOrder = [
  "DATE",
  "PARTIES",
  "AGREEMENT",
  "PAYMENT_TERMS",
  "ADDITIONAL_TERMS",
  "EXECUTION",
];

const agreementSectionOrder = [
  "1. Definitions",
  "2. Term",
  "3. Commission",
  "4. Interest",
  "5. Audit",
  "6. Warranties",
  "7. Termination",
  "8. Effects of termination",
  "9. Notices",
  "10. General",
  "11. Interpretation",
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
    title: "Date and Agreement Type",
    date: {
      question: "Enter the date of the agreement",
      type: "date",
    },
  },
  step2: {
    title: "First Party Details",
    firstPartyType: {
      question: "Select type of First Party",
      type: "select",
      options: ["Individual", "Company", "Partnership"],
    },
    individual: {
      name: {
        question: "Enter individual's full name",
        type: "text",
        showIf: "firstPartyType=Individual",
      },
      address: {
        question: "Enter individual's address",
        type: "text",
        showIf: "firstPartyType=Individual",
      },
    },
    company: {
      name: {
        question: "Enter company name",
        type: "text",
        showIf: "firstPartyType=Company",
      },
      regNumber: {
        question: "Enter registration number",
        type: "text",
        showIf: "firstPartyType=Company",
      },
      address: {
        question: "Enter registered office address",
        type: "text",
        showIf: "firstPartyType=Company",
      },
      signatory: {
        question: "Enter name of person signing on behalf of the company",
        type: "text",
        showIf: "firstPartyType=Company",
      },
    },
    partnership: {
      name: {
        question: "Enter partnership name",
        type: "text",
        showIf: "firstPartyType=Partnership",
      },
      address: {
        question: "Enter principal place of business",
        type: "text",
        showIf: "firstPartyType=Partnership",
      },
      signatory: {
        question: "Enter name of partner signing on behalf of the partnership",
        type: "text",
        showIf: "firstPartyType=Partnership",
      },
    },
  },
  step3: {
    title: "Second Party Details",
    secondPartyType: {
      question: "Select type of Second Party",
      type: "select",
      options: ["Individual", "Company", "Partnership"],
    },
    individual: {
      name: {
        question: "Enter individual's full name",
        type: "text",
        showIf: "secondPartyType=Individual",
      },
      address: {
        question: "Enter individual's address",
        type: "text",
        showIf: "secondPartyType=Individual",
      },
    },
    company: {
      name: {
        question: "Enter company name",
        type: "text",
        showIf: "secondPartyType=Company",
      },
      regNumber: {
        question: "Enter registration number",
        type: "text",
        showIf: "secondPartyType=Company",
      },
      address: {
        question: "Enter registered office address",
        type: "text",
        showIf: "secondPartyType=Company",
      },
      signatory: {
        question: "Enter name of person signing on behalf of the company",
        type: "text",
        showIf: "secondPartyType=Company",
      },
    },
    partnership: {
      name: {
        question: "Enter partnership name",
        type: "text",
        showIf: "secondPartyType=Partnership",
      },
      address: {
        question: "Enter principal place of business",
        type: "text",
        showIf: "secondPartyType=Partnership",
      },
      signatory: {
        question: "Enter name of partner signing on behalf of the partnership",
        type: "text",
        showIf: "secondPartyType=Partnership",
      },
    },
  },
  step4: {
    title: "Commission Details",
    baseAmount: {
      question: "Enter the Base Amount",
      type: "text",
    },
    commissionPercentage: {
      question: "Enter the Commission percentage",
      type: "text",
    },
    triggerEvent: {
      question: "Specify the Trigger Event",
      type: "text",
    },
    triggerEventTiming: {
      question: "When must the Trigger Event occur?",
      type: "select",
      options: [
        "wholly during the Term",
        "at least partly during the Term"
      ]
    },
    // New fields for clause 2.2 (Agreement Term)
    agreementTerm: {
      question: "How long will this Agreement continue in force?",
      type: "select",
      options: [
        "indefinitely",
        "until a specific date",
        "until a specific event"
      ]
    },
    termDate: {
      question: "Enter the termination date",
      type: "date",
      showIf: "agreementTerm=until a specific date"
    },
    termEvent: {
      question: "Describe the termination event",
      type: "text",
      showIf: "agreementTerm=until a specific event"
    },
    // New fields for clause 3.2 (Trigger Event Notification)
    notificationDays: {
      question: "Business days for notification",
      type: "text",
      defaultValue: "10"
    },
    notificationTiming: {
      question: "When does the notification period start?",
      type: "select",
      options: [
        "a Trigger Event",
        "the start of a Trigger Event",
        "the end of a Trigger Event"
      ]
    },
    paymentTerms: {
      question: "Enter payment terms",
      type: "text",
    },
    additionalTerms: {
      question: "Enter any additional terms",
      type: "textarea",
    },
  },
};

const documentPathMap = {
  // Date field
  date: ["Commission Agreement.DATE.content"],

  // First Party fields
  firstPartyType: ["Commission Agreement.PARTIES.1.content"],
  // First Party (Individual)
  firstParty_individual_name: [
    "Commission Agreement.PARTIES.1.content",
    "Commission Agreement.EXECUTION.signature_blocks.first_party",
  ],
  firstParty_individual_address: ["Commission Agreement.PARTIES.1.content"],

  // First Party (Company)
  firstParty_company_name: [
    "Commission Agreement.PARTIES.1.content",
    "Commission Agreement.EXECUTION.signature_blocks.first_party",
  ],
  firstParty_company_regNumber: ["Commission Agreement.PARTIES.1.content"],
  firstParty_company_address: ["Commission Agreement.PARTIES.1.content"],
  firstParty_company_signatory: [
    "Commission Agreement.EXECUTION.signature_blocks.first_party",
  ],

  // First Party (Partnership)
  firstParty_partnership_name: [
    "Commission Agreement.PARTIES.1.content",
    "Commission Agreement.EXECUTION.signature_blocks.first_party",
  ],
  firstParty_partnership_address: ["Commission Agreement.PARTIES.1.content"],
  firstParty_partnership_signatory: [
    "Commission Agreement.EXECUTION.signature_blocks.first_party",
  ],

  // Second Party fields
  secondPartyType: ["Commission Agreement.PARTIES.2.content"],
  // Second Party (Individual)
  secondParty_individual_name: [
    "Commission Agreement.PARTIES.2.content",
    "Commission Agreement.EXECUTION.signature_blocks.second_party",
  ],
  secondParty_individual_address: ["Commission Agreement.PARTIES.2.content"],

  // Second Party (Company)
  secondParty_company_name: [
    "Commission Agreement.PARTIES.2.content",
    "Commission Agreement.EXECUTION.signature_blocks.second_party",
  ],
  secondParty_company_regNumber: ["Commission Agreement.PARTIES.2.content"],
  secondParty_company_address: ["Commission Agreement.PARTIES.2.content"],
  secondParty_company_signatory: [
    "Commission Agreement.EXECUTION.signature_blocks.second_party",
  ],

  // Second Party (Partnership)
  secondParty_partnership_name: [
    "Commission Agreement.PARTIES.2.content",
    "Commission Agreement.EXECUTION.signature_blocks.second_party",
  ],
  secondParty_partnership_address: ["Commission Agreement.PARTIES.2.content"],
  secondParty_partnership_signatory: [
    "Commission Agreement.EXECUTION.signature_blocks.second_party",
  ],

  // Commission Details (from step 4)
  baseAmount: ["Commission Agreement.AGREEMENT.1. Definitions.1.1.Base Amount"],
  commissionPercentage: [
    "Commission Agreement.AGREEMENT.1. Definitions.1.1.Commission",
  ],
  triggerEvent: [
    "Commission Agreement.AGREEMENT.1. Definitions.1.1.Trigger Event",
  ],
  triggerEventTiming: [
    "Commission Agreement.AGREEMENT.1. Definitions.1.1.Trigger Event",
  ],
  // New mappings for clause 2.2 and 3.2
  agreementTerm: ["Commission Agreement.AGREEMENT.2. Term.2.2.content"],
  termDate: ["Commission Agreement.AGREEMENT.2. Term.2.2.content"],
  termEvent: ["Commission Agreement.AGREEMENT.2. Term.2.2.content"],
  notificationDays: ["Commission Agreement.AGREEMENT.3. Commission.3.2.content"],
  notificationTiming: ["Commission Agreement.AGREEMENT.3. Commission.3.2.content"],
  paymentTerms: ["Commission Agreement.PAYMENT_TERMS.content"],
  additionalTerms: ["Commission Agreement.ADDITIONAL_TERMS.content"],
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
  paths.forEach((path) => {
    // Find elements with this path
    const elements = previewElem.querySelectorAll(
      `[data-value-path="${path}"]`
    );
    if (elements.length === 0) {
      // Try finding parent section if exact path not found
      const basePathParts = path.split(".");
      basePathParts.pop(); // Remove the last part (usually "content")
      const basePath = basePathParts.join(".");
      const parentElements = previewElem.querySelectorAll(
        `[data-path="${basePath}"]`
      );

      parentElements.forEach((elem) => {
        elem.classList.add("highlighted-section");
      });
    } else {
      elements.forEach((elem) => {
        elem.classList.add("highlighted");
      });
    }
  });

  // Delay scrolling by 1ms after highlighting
  setTimeout(() => {
    // Scroll to the first highlighted element
    const firstHighlighted = document.querySelector(
      ".highlighted, .highlighted-section"
    );
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
  const highlightedElements = previewElem.querySelectorAll(
    ".highlighted, .highlighted-section"
  );
  highlightedElements.forEach((element) => {
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
    window.currentDocument = { "Commission Agreement": {} };
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
      // Updated: Check for "AGREEMENT" instead of "ASSIGNMENT"
      if (key === "AGREEMENT") {
        const actualKeys = Object.keys(value);
        keys = agreementSectionOrder
          .filter((k) => actualKeys.includes(k))
          .concat(actualKeys.filter((k) => !agreementSectionOrder.includes(k)));
      }

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
        if (this.id === "firstPartyType" || this.id === "secondPartyType") {
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
  document
    .querySelectorAll(
      "#keyContainer input, #keyContainer select, #keyContainer textarea"
    )
    .forEach((input) => {
      // Focus event (initial click)
      input.addEventListener("focus", function () {
        const fieldId = this.id;
        highlightDocumentSection(fieldId);
      });

      // Add INPUT event to maintain highlighting during editing
      input.addEventListener("input", function () {
        const fieldId = this.id;
        highlightDocumentSection(fieldId);
      });

      // Blur event (when leaving the field)
      input.addEventListener("blur", function () {
        setTimeout(() => {
          if (
            !document.activeElement ||
            !document.activeElement.hasAttribute("data-affects-path")
          ) {
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
  const isFirstPartySection =
    stepData.title && stepData.title.includes("First Party");
  const isSecondPartySection =
    stepData.title && stepData.title.includes("Second Party");
  const sectionClass = isFirstPartySection
    ? "first-party-section"
    : isSecondPartySection
    ? "second-party-section"
    : "";

  for (const [key, data] of Object.entries(stepData)) {
    if (key === "title") continue;

    if (typeof data === "object" && !data.type) {
      // This is a group of questions - add section class
      const groupClass = isFirstPartySection
        ? "first-party-group"
        : isSecondPartySection
        ? "second-party-group"
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
  if (dataShowIf.includes("firstPartyType=")) {
    const type = dataShowIf.split("=")[1].toLowerCase();
    prefix = `firstParty_${type}_`;
  } else if (dataShowIf.includes("secondPartyType=")) {
    const type = dataShowIf.split("=")[1].toLowerCase();
    prefix = `secondParty_${type}_`;
  } else if (key === "firstPartyType" || key === "secondPartyType") {
    // No prefix for the type selectors themselves
    prefix = "";
  }

  // Create full ID
  const fullId = prefix ? prefix + key : key;

  // Get affected paths for data attribute
  const affectedPaths = documentPathMap[fullId]
    ? `data-affects-path="${documentPathMap[fullId].join(",")}"`
    : "";

  // Handle special cases for the type selectors themselves
  if (key === "firstPartyType" || key === "secondPartyType") {
    return `
      <select id="${key}" onchange="handlePartyTypeChange(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options
          .map((opt) => `<option value="${opt}">${opt}</option>`)
          .join("")}
      </select>
    `;
  }

  // Create the appropriate input element
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
  // Restore all saved values for this step
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && formDataStore[input.id]) {
      input.value = formDataStore[input.id];

      // Handle conditional field visibility
      if (input.tagName === "SELECT") {
        // For party type selectors, use the specific handler
        if (input.id === "firstPartyType" || input.id === "secondPartyType") {
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
  const isFirstParty = selectElement.id === "firstPartyType";
  const isSecondParty = selectElement.id === "secondPartyType";
  const selectedType = selectElement.value;

  if (!selectedType) return;

  // Clear previous values for other types from formDataStore
  const prefix = isFirstParty ? "firstParty_" : "secondParty_";
  const allPartyTypes = ["individual", "company", "partnership"];

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
  // This will trigger additional highlighting for that field
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

/**
 * Maps form data to document structure
 * @param {Object} flatDoc - Flattened document object
 * @param {Object} formData - The form data
 * @return {Object} Updated flat document
 */
function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };
  const documentTitle =
    Object.keys(window.currentDocument)[0] || "Commission Agreement";

  // Format date if provided
  if (formData.date) {
    const formattedDate = formatDate(formData.date);
    const dateKey = `${documentTitle}.DATE.content`;
    updatedFlatDoc[dateKey] = formattedDate;
  }

  // Update First Party information (Party 1)
  if (formData.firstPartyType) {
    const party1Key = `${documentTitle}.PARTIES.1.content`;
    let party1Content = "";

    if (formData.firstPartyType === "Individual") {
      const name = formData.firstParty_individual_name || "*[INDIVIDUAL NAME]*";
      const address = formData.firstParty_individual_address || "*[address]*";
      party1Content = `${name} of ${address}`;
    } else if (formData.firstPartyType === "Company") {
      const name = formData.firstParty_company_name || "*[COMPANY NAME]*";
      const regNumber =
        formData.firstParty_company_regNumber || "*[registration number]*";
      const address = formData.firstParty_company_address || "*[address]*";
      party1Content = `${name}, a company incorporated in *[jurisdiction]* (registration number ${regNumber}) having its registered office at ${address}`;
    } else if (formData.firstPartyType === "Partnership") {
      const name =
        formData.firstParty_partnership_name || "*[PARTNERSHIP NAME]*";
      const address = formData.firstParty_partnership_address || "*[address]*";
      party1Content = `${name}, a partnership established under the laws of *[jurisdiction]* having its principal place of business at ${address}`;
    }

    if (party1Content) {
      updatedFlatDoc[party1Key] = party1Content + ' (the "First Party")';
    }
  }

  // Update Second Party information (Party 2)
  if (formData.secondPartyType) {
    const party2Key = `${documentTitle}.PARTIES.2.content`;
    let party2Content = "";

    if (formData.secondPartyType === "Individual") {
      const name =
        formData.secondParty_individual_name || "*[INDIVIDUAL NAME]*";
      const address = formData.secondParty_individual_address || "*[address]*";
      party2Content = `${name} of ${address}`;
    } else if (formData.secondPartyType === "Company") {
      const name = formData.secondParty_company_name || "*[COMPANY NAME]*";
      const regNumber =
        formData.secondParty_company_regNumber || "*[registration number]*";
      const address = formData.secondParty_company_address || "*[address]*";
      party2Content = `${name}, a company incorporated in *[jurisdiction]* (registration number ${regNumber}) having its registered office at ${address}`;
    } else if (formData.secondPartyType === "Partnership") {
      const name =
        formData.secondParty_partnership_name || "*[PARTNERSHIP NAME]*";
      const address = formData.secondParty_partnership_address || "*[address]*";
      party2Content = `${name}, a partnership established under the laws of *[jurisdiction]* having its principal place of business at ${address}`;
    }

    if (party2Content) {
      updatedFlatDoc[party2Key] = party2Content + ' (the "Second Party")';
    }
  }

  // Update Commission Details
  // Base Amount
  if (formData.baseAmount) {
    const baseAmountKey = `${documentTitle}.AGREEMENT.1. Definitions.1.1.Base Amount`;
    const currentValue = flatDoc[baseAmountKey] || "";
    
    // Replace only the placeholder, not the entire value
    if (currentValue.includes("*[specify amount]*")) {
      updatedFlatDoc[baseAmountKey] = currentValue.replace("*[specify amount]*", formData.baseAmount);
    } else {
      // If there's no placeholder or this is the first time setting the value
      updatedFlatDoc[baseAmountKey] = formData.baseAmount;
    }
  }
  // Commission Percentage
  if (formData.commissionPercentage) {
    const commissionKey = `${documentTitle}.AGREEMENT.1. Definitions.1.1.Commission`;
    const currentValue = flatDoc[commissionKey] || "";
    
    if (currentValue.includes("*[percentage]*")) {
      updatedFlatDoc[commissionKey] = currentValue.replace("*[percentage]*", formData.commissionPercentage);
    } else {
      updatedFlatDoc[commissionKey] = formData.commissionPercentage;
    }
  }
  // Trigger Event
  if (formData.triggerEvent || formData.triggerEventTiming) {
    const triggerEventKey = `${documentTitle}.AGREEMENT.1. Definitions.1.1.Trigger Event`;
    const currentValue = flatDoc[triggerEventKey] || "";
    const triggerEvent = formData.triggerEvent || "*[specify trigger event]*";
    const timing = formData.triggerEventTiming || "wholly during the Term";
    
    // Create complete content with both event type and timing option
    let updatedValue = currentValue;
    
    // Check if this is a full replacement or just updating parts
    if (currentValue.includes("*[specify trigger event]*") && currentValue.includes("[wholly during the Term] OR [at least partly during the Term]")) {
      // Replace both placeholders at once
      updatedValue = currentValue
        .replace("*[specify trigger event]*", triggerEvent)
        .replace("[wholly during the Term] OR [at least partly during the Term]", `[${timing}]`);
    } 
    // If we already replaced the trigger event but not the timing
    else if (currentValue.includes("[wholly during the Term] OR [at least partly during the Term]")) {
      updatedValue = currentValue.replace("[wholly during the Term] OR [at least partly during the Term]", `[${timing}]`);
    }
    // If we need to replace just the trigger event
    else if (currentValue.includes("*[specify trigger event]*")) {
      updatedValue = currentValue.replace("*[specify trigger event]*", triggerEvent);
    }
    // If nothing matches, create a complete definition
    else if (!currentValue || currentValue.trim() === "") {
      updatedValue = `means an event giving rise to a Commission payment obligation under this Agreement, namely ${triggerEvent}, providing that such event must take place [${timing}]`;
    }
    
    updatedFlatDoc[triggerEventKey] = updatedValue;
  }
  // Payment Terms
  if (formData.paymentTerms) {
    const paymentTermsKey = `${documentTitle}.PAYMENT_TERMS.content`;
    const currentValue = flatDoc[paymentTermsKey] || "";
    
    // Use payment terms as plain text input now
    const paymentTermsValue = formData.paymentTerms;
    
    if (currentValue.includes("*[specify payment terms]*")) {
      updatedFlatDoc[paymentTermsKey] = currentValue.replace("*[specify payment terms]*", paymentTermsValue);
    } else {
      updatedFlatDoc[paymentTermsKey] = paymentTermsValue;
    }
  }
  // Additional Terms
  if (formData.additionalTerms) {
    const additionalTermsKey = `${documentTitle}.ADDITIONAL_TERMS.content`;
    const currentValue = flatDoc[additionalTermsKey] || "";
    
    if (currentValue.includes("*[specify additional terms]*")) {
      updatedFlatDoc[additionalTermsKey] = currentValue.replace("*[specify additional terms]*", formData.additionalTerms);
    } else {
      updatedFlatDoc[additionalTermsKey] = formData.additionalTerms;
    }
  }

  // Agreement Term (clause 2.2)
  if (formData.agreementTerm) {
    const termKey = `${documentTitle}.AGREEMENT.2. Term.2.2.content`;
    let termContent = "This Agreement shall continue in force ";
    
    if (formData.agreementTerm === "indefinitely") {
      termContent += "[indefinitely]";
    } else if (formData.agreementTerm === "until a specific date") {
      termContent += `[until ${formData.termDate || "*[date]*"}, at the beginning of which this Agreement shall terminate automatically]`;
    } else if (formData.agreementTerm === "until a specific event") {
      termContent += `[until ${formData.termEvent || "*[event]*"}, upon which this Agreement shall terminate automatically]`;
    } else {
      termContent += formData.agreementTerm;
    }
    
    termContent += ", subject to termination in accordance with Clause 7 or any other provision of this Agreement.";
    updatedFlatDoc[termKey] = termContent;
  }

  // Trigger Event Notification (clause 3.2)
  if (formData.notificationTiming || formData.notificationDays) {
    const notificationKey = `${documentTitle}.AGREEMENT.3. Commission.3.2.content`;
    const days = formData.notificationDays || "10";
    const timing = formData.notificationTiming || "a Trigger Event";
    
    const notificationContent = `Within the period of [${days} Business Days] following [${timing}], the First Party must notify the Second Party of the occurrence of that Trigger Event and the amount of Commission due to the Second Party in respect of that Trigger Event.`;
    
    updatedFlatDoc[notificationKey] = notificationContent;
  }

  // Update Execution (signature blocks) for First Party
  if (formData.firstPartyType) {
    const firstPartySigKey = `${documentTitle}.EXECUTION.signature_blocks.first_party`;
    let signatureContent = "";

    if (formData.firstPartyType === "Individual") {
      const name = formData.firstParty_individual_name || "*[individual name]*";
      signatureContent = `SIGNED BY ${name} on *[...........], the First Party`;
    } else if (formData.firstPartyType === "Company") {
      const name = formData.firstParty_company_name || "*[COMPANY NAME]*";
      const signatory =
        formData.firstParty_company_signatory || "*[individual name]*";
      signatureContent = `SIGNED BY ${signatory} on *[...........], duly authorised for and on behalf of ${name}`;
    } else if (formData.firstPartyType === "Partnership") {
      const name =
        formData.firstParty_partnership_name || "*[PARTNERSHIP NAME]*";
      const signatory =
        formData.firstParty_partnership_signatory || "*[individual name]*";
      signatureContent = `SIGNED BY ${signatory} on *[...........], duly authorised for and on behalf of ${name}`;
    }

    if (signatureContent) {
      updatedFlatDoc[firstPartySigKey] = signatureContent;
    }
  }

  // Update Execution (signature blocks) for Second Party
  if (formData.secondPartyType) {
    const secondPartySigKey = `${documentTitle}.EXECUTION.signature_blocks.second_party`;
    let signatureContent = "";

    if (formData.secondPartyType === "Individual") {
      const name =
        formData.secondParty_individual_name || "*[individual name]*";
      signatureContent = `SIGNED BY ${name} on *[...........], the Second Party`;
    } else if (formData.secondPartyType === "Company") {
      const name = formData.secondParty_company_name || "*[COMPANY NAME]*";
      const signatory =
        formData.secondParty_company_signatory || "*[individual name]*";
      signatureContent = `SIGNED BY ${signatory} on *[...........], duly authorised for and on behalf of ${name}`;
    } else if (formData.secondPartyType === "Partnership") {
      const name =
        formData.secondParty_partnership_name || "*[PARTNERSHIP NAME]*";
      const signatory =
        formData.secondParty_partnership_signatory || "*[individual name]*";
      signatureContent = `SIGNED BY ${signatory} on *[...........], duly authorised for and on behalf of ${name}`;
    }

    if (signatureContent) {
      updatedFlatDoc[secondPartySigKey] = signatureContent;
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

// Add these functions near the enableEditing function

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

/* --- Open and close modal for inserting new content --- */
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
  // Update: use "AGREEMENT" instead of "ASSIGNMENT"
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
  // Update: use "AGREEMENT" instead of "ASSIGNMENT"
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
        // Update condition to check for Commission Agreement instead of Assignment of Copyright
        const isDateOrParties =
          path.startsWith("Commission Agreement.DATE") ||
          path.startsWith("Commission Agreement.PARTIES");

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
    path.startsWith("Commission Agreement.DATE") ||
    path.startsWith("Commission Agreement.PARTIES")
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
window.highlightDocumentSection = highlightDocumentSection;
window.clearHighlights = clearHighlights;
window.toggleEditMode = toggleEditMode;
