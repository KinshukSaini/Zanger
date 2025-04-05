// Document order configuration
const sectionOrder = [
  "DATE",
  "PARTIES",
  "BACKGROUND",
  "AGREEMENT",
  "EXECUTION",
  "SCHEDULE 1",
  "SCHEDULE 2",
];

const agreementSectionOrder = [
  "2. Definitions",
  "3. Term",
  "4. Non-exclusive distributorship",
  "5. Distributor obligations",
  "6. Supplier obligations",
  "7. Order procedure",
  "8. No assignment of Intellectual Property Rights",
  "9. Charges",
  "10. Payments",
  "11. Confidentiality obligations",
  "12. Warranties",
  "13. Supplier Indemnity",
  "14. Limitations and exclusions of liability",
  "15. Force Majeure Event",
  "16. Termination",
  "17. Effects of termination",
  "18. Notices",
  "19. General",
  "20. Interpretation",
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
    title: "Supplier Details",
    supplierType: {
      question: "Select type of Supplier",
      type: "select",
      options: ["Individual", "Company", "Partnership"],
    },
    individual: {
      name: {
        question: "Enter individual's full name",
        type: "text",
        showIf: "supplierType=Individual",
      },
      address: {
        question: "Enter individual's address",
        type: "text",
        showIf: "supplierType=Individual",
      },
    },
    company: {
      name: {
        question: "Enter company name",
        type: "text",
        showIf: "supplierType=Company",
      },
      regNumber: {
        question: "Enter registration number",
        type: "text",
        showIf: "supplierType=Company",
      },
      address: {
        question: "Enter registered office address",
        type: "text",
        showIf: "supplierType=Company",
      },
      signatory: {
        question: "Enter name of person signing on behalf of the company",
        type: "text",
        showIf: "supplierType=Company",
      },
    },
    partnership: {
      name: {
        question: "Enter partnership name",
        type: "text",
        showIf: "supplierType=Partnership",
      },
      address: {
        question: "Enter principal place of business",
        type: "text",
        showIf: "supplierType=Partnership",
      },
      signatory: {
        question: "Enter name of partner signing on behalf of the partnership",
        type: "text",
        showIf: "supplierType=Partnership",
      },
    },
  },
  step3: {
    title: "Distributor Details",
    distributorType: {
      question: "Select type of Distributor",
      type: "select",
      options: ["Individual", "Company", "Partnership"],
    },
    individual: {
      name: {
        question: "Enter individual's full name",
        type: "text",
        showIf: "distributorType=Individual",
      },
      address: {
        question: "Enter individual's address",
        type: "text",
        showIf: "distributorType=Individual",
      },
    },
    company: {
      name: {
        question: "Enter company name",
        type: "text",
        showIf: "distributorType=Company",
      },
      regNumber: {
        question: "Enter registration number",
        type: "text",
        showIf: "distributorType=Company",
      },
      address: {
        question: "Enter registered office address",
        type: "text",
        showIf: "distributorType=Company",
      },
      signatory: {
        question: "Enter name of person signing on behalf of the company",
        type: "text",
        showIf: "distributorType=Company",
      },
    },
    partnership: {
      name: {
        question: "Enter partnership name",
        type: "text",
        showIf: "distributorType=Partnership",
      },
      address: {
        question: "Enter principal place of business",
        type: "text",
        showIf: "distributorType=Partnership",
      },
      signatory: {
        question: "Enter name of partner signing on behalf of the partnership",
        type: "text",
        showIf: "distributorType=Partnership",
      },
    },
  },
  step4: {
    title: "Distribution Details",
    consideration: {
      question: "Enter the fee or charge amount",
      type: "text",
    },
    works: {
      question: "Describe the products being distributed",
      type: "textarea",
    },
    excludedIP: {
      question: "Specify any exclusions (if any)",
      type: "textarea",
    },
  },
};

const documentPathMap = {
  // Date field
  date: ["Non‑exclusive distribution agreement.DATE.content"],

  supplierType: ["Non‑exclusive distribution agreement.PARTIES.1.content"],
  distributorType: ["Non‑exclusive distribution agreement.PARTIES.2.content"],

  // Supplier fields (Individual)
  supplier_individual_name: [
    "Non‑exclusive distribution agreement.PARTIES.1.content",
    "Non‑exclusive distribution agreement.EXECUTION.signature_blocks.supplier",
  ],
  supplier_individual_address: [
    "Non‑exclusive distribution agreement.PARTIES.1.content",
  ],

  // Supplier fields (Company)
  supplier_company_name: [
    "Non‑exclusive distribution agreement.PARTIES.1.content",
    "Non‑exclusive distribution agreement.EXECUTION.signature_blocks.supplier",
  ],
  supplier_company_regNumber: [
    "Non‑exclusive distribution agreement.PARTIES.1.content",
  ],
  supplier_company_address: [
    "Non‑exclusive distribution agreement.PARTIES.1.content",
  ],
  supplier_company_signatory: [
    "Non‑exclusive distribution agreement.EXECUTION.signature_blocks.supplier",
  ],

  // Supplier fields (Partnership)
  supplier_partnership_name: [
    "Non‑exclusive distribution agreement.PARTIES.1.content",
    "Non‑exclusive distribution agreement.EXECUTION.signature_blocks.supplier",
  ],
  supplier_partnership_address: [
    "Non‑exclusive distribution agreement.PARTIES.1.content",
  ],
  supplier_partnership_signatory: [
    "Non‑exclusive distribution agreement.EXECUTION.signature_blocks.supplier",
  ],

  // Distributor fields (Individual)
  distributor_individual_name: [
    "Non‑exclusive distribution agreement.PARTIES.2.content",
    "Non‑exclusive distribution agreement.EXECUTION.signature_blocks.distributor",
  ],
  distributor_individual_address: [
    "Non‑exclusive distribution agreement.PARTIES.2.content",
  ],

  // Distributor fields (Company)
  distributor_company_name: [
    "Non‑exclusive distribution agreement.PARTIES.2.content",
    "Non‑exclusive distribution agreement.EXECUTION.signature_blocks.distributor",
  ],
  distributor_company_regNumber: [
    "Non‑exclusive distribution agreement.PARTIES.2.content",
  ],
  distributor_company_address: [
    "Non‑exclusive distribution agreement.PARTIES.2.content",
  ],
  distributor_company_signatory: [
    "Non‑exclusive distribution agreement.EXECUTION.signature_blocks.distributor",
  ],

  // Distributor fields (Partnership)
  distributor_partnership_name: [
    "Non‑exclusive distribution agreement.PARTIES.2.content",
    "Non‑exclusive distribution agreement.EXECUTION.signature_blocks.distributor",
  ],
  distributor_partnership_address: [
    "Non‑exclusive distribution agreement.PARTIES.2.content",
  ],
  distributor_partnership_signatory: [
    "Non‑exclusive distribution agreement.EXECUTION.signature_blocks.distributor",
  ],

  // Distribution details (from Step 4)
  consideration: [
    "Non‑exclusive distribution agreement.AGREEMENT.9. Charges.content",
  ],
  works: [
    "Non‑exclusive distribution agreement.SCHEDULE 1.DISTRIBUTION PARTICULARS.1. Products.content",
  ],
  excludedIP: [
    "Non‑exclusive distribution agreement.SCHEDULE 1.DISTRIBUTION PARTICULARS.2. Charges.content",
  ],
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
    window.currentDocument = { "Non‑exclusive distribution agreement": {} };
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
  
  // Add this to your DOMContentLoaded handler to test highlighting
  setTimeout(() => {
    const testElement = document.querySelector("#documentPreview span");
    if (testElement) {
      console.log("Testing highlight on:", testElement);
      testElement.classList.add("highlighted");
    }
  }, 2000);
});

function convertToHtml(document) {
  let html = [];
  const documentTitle = Object.keys(document)[0];
  if (documentTitle) {
    // Normalize the document title to use the correct hyphen type for path matching
    const normalizedTitle = "Non‑exclusive distribution agreement"; // Use the exact format from documentPathMap
    
    html.push(
      `<div class="document-title"><strong>${documentTitle}</strong></div>`
    );
    const mainContent = document[documentTitle];
    sectionOrder.forEach((section) => {
      if (mainContent[section]) {
        processSection(section, mainContent[section], 0, normalizedTitle);
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
      // Special handling for the "AGREEMENT" section
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
        if (this.id === "supplierType" || this.id === "distributorType") {
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

  // Add section identifier classes based on the new party names
  const isSupplierSection =
    stepData.title && stepData.title.includes("Supplier");
  const isDistributorSection =
    stepData.title && stepData.title.includes("Distributor");
  const sectionClass = isSupplierSection
    ? "supplier-section"
    : isDistributorSection
    ? "distributor-section"
    : "";

  for (const [key, data] of Object.entries(stepData)) {
    if (key === "title") continue;

    if (typeof data === "object" && !data.type) {
      // This is a group of questions - add section class
      const groupClass = isSupplierSection
        ? "supplier-group"
        : isDistributorSection
        ? "distributor-group"
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
  if (dataShowIf.includes("supplierType=")) {
    const type = dataShowIf.split("=")[1].toLowerCase();
    prefix = `supplier_${type}_`;
  } else if (dataShowIf.includes("distributorType=")) {
    const type = dataShowIf.split("=")[1].toLowerCase();
    prefix = `distributor_${type}_`;
  } else if (key === "supplierType" || key === "distributorType") {
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
  if (key === "supplierType" || key === "distributorType") {
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
        if (input.id === "supplierType" || input.id === "distributorType") {
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
  const isSupplier = selectElement.id === "supplierType";
  const isDistributor = selectElement.id === "distributorType";
  const selectedType = selectElement.value;

  if (!selectedType) return;

  // Clear previous values for other types from formDataStore
  const prefix = isSupplier ? "supplier_" : "distributor_";
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
    Object.keys(window.currentDocument)[0] ||
    "Non‑exclusive distribution agreement";

  // Format date if provided
  if (formData.date) {
    const formattedDate = formatDate(formData.date);
    const dateKey = `${documentTitle}.DATE.content`;
    updatedFlatDoc[dateKey] = formattedDate;
  }

  // Update Supplier information (Party 1)
  if (formData.supplierType) {
    const party1Key = `${documentTitle}.PARTIES.1.content`;
    let party1Content = "";

    if (formData.supplierType === "Individual") {
      const name = formData.supplier_individual_name || "*[INDIVIDUAL NAME]*";
      const address = formData.supplier_individual_address || "*[address]*";
      party1Content = `${name} of ${address}`;
    } else if (formData.supplierType === "Company") {
      const name = formData.supplier_company_name || "*[COMPANY NAME]*";
      const regNumber =
        formData.supplier_company_regNumber || "*[registration number]*";
      const address = formData.supplier_company_address || "*[address]*";
      party1Content = `${name}, a company incorporated in England and Wales (registration number ${regNumber}) having its registered office at ${address}`;
    } else if (formData.supplierType === "Partnership") {
      const name = formData.supplier_partnership_name || "*[PARTNERSHIP NAME]*";
      const address = formData.supplier_partnership_address || "*[address]*";
      party1Content = `${name}, a partnership established under the laws of England and Wales having its principal place of business at ${address}`;
    }

    if (party1Content) {
      updatedFlatDoc[party1Key] = party1Content + ' (the "Supplier")';
    }
  }

  // Update Distributor information (Party 2)
  if (formData.distributorType) {
    const party2Key = `${documentTitle}.PARTIES.2.content`;
    let party2Content = "";

    if (formData.distributorType === "Individual") {
      const name =
        formData.distributor_individual_name || "*[INDIVIDUAL NAME]*";
      const address = formData.distributor_individual_address || "*[address]*";
      party2Content = `${name} of ${address}`;
    } else if (formData.distributorType === "Company") {
      const name = formData.distributor_company_name || "*[COMPANY NAME]*";
      const regNumber =
        formData.distributor_company_regNumber || "*[registration number]*";
      const address = formData.distributor_company_address || "*[address]*";
      party2Content = `${name}, a company incorporated in England and Wales (registration number ${regNumber}) having its registered office at ${address}`;
    } else if (formData.distributorType === "Partnership") {
      const name =
        formData.distributor_partnership_name || "*[PARTNERSHIP NAME]*";
      const address = formData.distributor_partnership_address || "*[address]*";
      party2Content = `${name}, a partnership established under the laws of England and Wales having its principal place of business at ${address}`;
    }

    if (party2Content) {
      updatedFlatDoc[party2Key] = party2Content + ' (the "Distributor")';
    }
  }

  // Update Distribution Details (Consideration)
  if (formData.consideration) {
    const considerationKey = `${documentTitle}.AGREEMENT.9. Charges.content`;
    updatedFlatDoc[
      considerationKey
    ] = `The Supplier has entered into this Distribution Agreement, and agrees to the provisions of this Agreement, in consideration for the payment by the Distributor to the Supplier of the sum of ${formData.consideration}, receipt of which the Supplier now acknowledges`;
  }

  // Update Products details from SCHEDULE 1 (works)
  if (formData.works) {
    const worksKey = `${documentTitle}.SCHEDULE 1.DISTRIBUTION PARTICULARS.1. Products.content`;
    updatedFlatDoc[worksKey] = formData.works;
  }

  // Update Charges details from SCHEDULE 1 (excludedIP)
  if (formData.excludedIP) {
    const excludedIPKey = `${documentTitle}.SCHEDULE 1.DISTRIBUTION PARTICULARS.2. Charges.content`;
    updatedFlatDoc[excludedIPKey] = formData.excludedIP;
  }

  // Update Execution (signature blocks) for Supplier
  if (formData.supplierType) {
    const supplierSigKey = `${documentTitle}.EXECUTION.signature_blocks.supplier`;
    let signatureContent = "";

    if (formData.supplierType === "Individual") {
      const name = formData.supplier_individual_name || "*[individual name]*";
      signatureContent = `SIGNED BY ${name} on *[...........], the Supplier`;
    } else if (formData.supplierType === "Company") {
      const name = formData.supplier_company_name || "*[COMPANY NAME]*";
      const signatory =
        formData.supplier_company_signatory || "*[individual name]*";
      signatureContent = `SIGNED BY ${signatory} on *[...........], duly authorised for and on behalf of ${name}`;
    } else if (formData.supplierType === "Partnership") {
      const name = formData.supplier_partnership_name || "*[PARTNERSHIP NAME]*";
      const signatory =
        formData.supplier_partnership_signatory || "*[individual name]*";
      signatureContent = `SIGNED BY ${signatory} on *[...........], duly authorised for and on behalf of ${name}`;
    }

    if (signatureContent) {
      updatedFlatDoc[supplierSigKey] = signatureContent;
    }
  }

  // Update Execution (signature blocks) for Distributor
  if (formData.distributorType) {
    const distributorSigKey = `${documentTitle}.EXECUTION.signature_blocks.distributor`;
    let signatureContent = "";

    if (formData.distributorType === "Individual") {
      const name =
        formData.distributor_individual_name || "*[individual name]*";
      signatureContent = `SIGNED BY ${name} on *[...........], the Distributor`;
    } else if (formData.distributorType === "Company") {
      const name = formData.distributor_company_name || "*[COMPANY NAME]*";
      const signatory =
        formData.distributor_company_signatory || "*[individual name]*";
      signatureContent = `SIGNED BY ${signatory} on *[...........], duly authorised for and on behalf of ${name}`;
    } else if (formData.distributorType === "Partnership") {
      const name =
        formData.distributor_partnership_name || "*[PARTNERSHIP NAME]*";
      const signatory =
        formData.distributor_partnership_signatory || "*[individual name]*";
      signatureContent = `SIGNED BY ${signatory} on *[...........], duly authorised for and on behalf of ${name}`;
    }

    if (signatureContent) {
      updatedFlatDoc[distributorSigKey] = signatureContent;
    }
  }

  return updatedFlatDoc;
}
// ain function for updating document with form data (using flatten/unflatten approach)
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
          path.startsWith("Non‑exclusive distribution agreement.DATE") ||
          path.startsWith("Non‑exclusive distribution agreement.PARTIES");

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
    path.startsWith("Non‑exclusive distribution agreement.DATE") ||
    path.startsWith("Non‑exclusive distribution agreement.PARTIES")
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

/* --- Download Functions --- */
async function downloadPdf() {
  try {
    const response = await fetch("/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document: window.currentDocument,
        format: "pdf",
      }),
    });

    if (!response.ok) throw new Error("Download failed. Please try again.");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document.pdf";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Download failed:", error);
    alert(error.message);
  }
}

function downloadWordDocx() {
  const content = document.getElementById("documentPreview").innerHTML;
  const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Document</title>
            <style>
                body {
                    font-family: Verdana;
                    font-size: 14px;
                    line-height: 1.8;
                    color: #333;
                    background-color: #fff;
                    margin: 20px;
                }
                h1, h2, h3, h4, h5, h6 {
                    font-family: Verdana;
                    font-size: 12px;
                    color: #2c3e50;
                    margin: 25px 0 15px;
                }
                p { margin: 15px 0; }
                ul, ol {
                    margin: 15px 0;
                    padding-left: 40px;
                }
                li { margin-bottom: 10px; }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                table, th, td { border: 1px solid #ddd; }
                th, td {
                    padding: 10px;
                    text-align: left;
                }
                hr { border: none; margin: 30px 0; }
                .key, strong, b {
                    font-weight: bold;
                    margin-right: 15px;
                    display: inline-block;
                    min-width: 120px;
                }
                .value { font-weight: normal; }
                .nested {
                    margin-left: 30px;
                    margin-top: 10px;
                    margin-bottom: 10px;
                    padding-left: 10px;
                    border-left: 2px dashed #ddd;
                }
                .nested .key,
                .nested strong,
                .nested b {
                    display: block;
                    margin-bottom: 5px;
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
  link.download = "document.docx";
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