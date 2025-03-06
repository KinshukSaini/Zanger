// Document order configuration
const sectionOrder = [
  "CONTRACT_HEADER",
  "PARTIES",
  "1. Subject of the Contract",
  "2. Price and Total Amount of the Contract",
  "3. Dates of delivery",
  "4. Quality of the goods",
  "5. Packing and Marking",
  "6. Delivery and Acceptance of Goods",
  "7. Payment",
  "8. Claims",
  "9. Arbitration",
  "10. Force-majeure",
  "11. Other Conditions",
  "12. Legal Addresses of the Parties"
];

// Initialize document template
let documentTemplate;

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

/**
 * Handle text selection in the document preview
 */
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

/**
 * Show the edit with AI button near the selection
 * @param {DOMRect} rect - The bounding rectangle of the selection
 */
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

/**
 * Open the edit dialog for AI-assisted editing
 */
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

/**
 * Close the edit dialog
 */
function closeEditDialog() {
  const dialog = document.getElementById("edit-ai-dialog");
  if (dialog) {
    dialog.style.display = "none";
    document.getElementById("ai-edit-prompt").value = "";
  }
}

/**
 * Submit the AI edit request to the server
 */
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

/**
 * Update the document with the AI response
 * @param {String} newText - The new text to replace the selection
 */
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

// Predefined questions for the foreign trade contract
const documentQuestions = {
  step1: {
    title: "Contract Basic Information",
    contractNumber: {
      question: "Contract Number",
      type: "text"
    },
    place: {
      question: "Place of Contract",
      type: "text"
    },
    date: {
      question: "Date of Contract",
      type: "date"
    }
  },
  step2: {
    title: "Parties Information",
    sellerName: {
      question: "Seller Name",
      type: "text"
    },
    buyerName: {
      question: "Buyer Name",
      type: "text"
    }
  },
  step3: {
    title: "Contract Details",
    basis: {
      question: "Delivery Basis (FOB, CIF, etc.)",
      type: "text"
    },
    port: {
      question: "Port/Place of Delivery",
      type: "text"
    },
    goodsAmount: {
      question: "Goods Amount",
      type: "text"
    },
    currency: {
      question: "Contract Currency",
      type: "text"
    },
    totalAmount: {
      question: "Total Contract Amount",
      type: "text"
    }
  },
  step4: {
    title: "Technical Details",
    deliveryDates: {
      question: "Delivery Dates",
      type: "text"
    },
    paymentTerms: {
      question: "Payment Terms",
      type: "textarea"
    },
    arbitration: {
      question: "Arbitration Place/Institution",
      type: "text"
    },
    forceMajeurePeriod: {
      question: "Force Majeure Period (in months)",
      type: "number"
    }
  },
  step5: {
    title: "Legal Addresses",
    sellerAddress: {
      question: "Seller's Legal Address",
      type: "textarea"
    },
    buyerAddress: {
      question: "Buyer's Legal Address",
      type: "textarea"
    }
  }
};

// Store form data between steps
let formDataStore = {};

/**
 * Initialize document when DOM is loaded
 */
document.addEventListener("DOMContentLoaded", async function () {
  console.log("Document initialization started");
  if (!window.currentDocument) {
    console.error("No document found in window.currentDocument");
    window.currentDocument = { "Foreign Trade Contract": {} };
  }

  try {
    // Initialize the document template
    initializeDocumentTemplate();

    // Show questionnaire for user input
    showQuestionnaire();

    // Then initialize the preview
    updatePreview();

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

/**
 * Convert document object to HTML for preview
 * @param {Object} document - The document object
 * @return {String} HTML representation of the document
 */
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

/**
 * Save text selection when user selects text
 */
function saveSelection() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) savedRange = sel.getRangeAt(0);
}

/**
 * Show the document questionnaire
 */
function showQuestionnaire() {
  // Get the container
  const container = document.getElementById("keyContainer");

  // Clear existing content
  container.innerHTML = "";

  // Create all steps at once in the container
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

        // Update document with form data
        updateDocumentWithFormData(formDataStore);
        updatePreview();
      });
    });

  // Restore all saved form data
  for (let step = 1; step <= 5; step++) {
    restoreStepData(step);
  }
}

/**
 * Create HTML for questions
 * @param {Object} stepData - Data for the current step
 * @return {String} HTML for the questions
 */
function createQuestionsHTML(stepData) {
  let html = "";

  for (const [key, data] of Object.entries(stepData)) {
    if (key === "title") continue;

    html += createQuestionField(key, data);
  }
  return html;
}

/**
 * Create HTML for a single question field
 * @param {String} key - The question key
 * @param {Object} data - Data for the question
 * @param {String} sectionClass - Optional section class
 * @return {String} HTML for the question field
 */
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

/**
 * Create HTML for an input element
 * @param {String} key - The input key
 * @param {Object} data - Data for the input
 * @return {String} HTML for the input element
 */
function createInputElement(key, data) {
  // Create the appropriate input element
  switch (data.type) {
    case "textarea":
      return `<textarea id="${key}" class="form-textarea" data-original-key="${key}"></textarea>`;
    case "date":
      return `<input type="date" id="${key}" data-original-key="${key}">`;
    case "number":
      return `<input type="number" id="${key}" data-original-key="${key}">`;
    case "select":
      return `
        <select id="${key}" data-original-key="${key}">
          <option value="">Select...</option>
          ${(data.options || []).map(opt => `<option value="${opt}">${opt}</option>`).join("")}
        </select>
      `;
    default:
      return `<input type="text" id="${key}" data-original-key="${key}">`;
  }
}

/**
 * Restore saved form data for a step
 * @param {Number} stepNumber - The step number
 */
function restoreStepData(stepNumber) {
  // Restore all saved values for this step
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && formDataStore[input.id]) {
      input.value = formDataStore[input.id];
    }
  });
}

/**
 * Format date from ISO format to display format
 * @param {String} dateStr - Date string in ISO format (yyyy-mm-dd)
 * @return {String} Formatted date string
 */
function formatDate(dateStr) {
  if (!dateStr) return "";

  // Assume dateStr is in format yyyy-mm-dd
  const [year, month, day] = dateStr.split("-");
  return `"${day}" ${getMonthName(parseInt(month))} ${year}`;
}

/**
 * Get month name from month number
 * @param {Number} monthNum - Month number (1-12)
 * @return {String} Month name
 */
function getMonthName(monthNum) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[monthNum - 1] || "";
}

/**
 * Split path into parts respecting special formatting
 * @param {String} path - The path to split
 * @return {Array} Array of path parts
 */
function splitPath(path) {
  let parts = path.split(".");
  return parts.map(part => part.trim());
}

/**
 * Update the document with form data
 * @param {Object} formData - The form data
 */
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

/**
 * Apply form data to the flat document
 * @param {Object} flatDoc - Flattened document object
 * @param {Object} formData - The form data
 * @return {Object} Updated flat document
 */
function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };
  const documentTitle = Object.keys(window.currentDocument)[0] || "Foreign Trade Contract";

  // Update Contract Header
  if (formData.contractNumber) {
    updatedFlatDoc[`${documentTitle}.CONTRACT_HEADER.contract_number`] = `CONTRACT N ${formData.contractNumber}`;
  }

  if (formData.place) {
    updatedFlatDoc[`${documentTitle}.CONTRACT_HEADER.place`] = formData.place;
  }

  if (formData.date) {
    updatedFlatDoc[`${documentTitle}.CONTRACT_HEADER.date`] = formatDate(formData.date);
  }

  // Update Parties
  if (formData.sellerName) {
    updatedFlatDoc[`${documentTitle}.PARTIES.seller.content`] =
      `${formData.sellerName}, hereinafter referred to as the Seller, on the one hand`;
  }

  if (formData.buyerName) {
    updatedFlatDoc[`${documentTitle}.PARTIES.buyer.content`] =
      `${formData.buyerName}, hereinafter referred to as the Buyer, on the other hand`;
  }

  // Update Subject of Contract
  if (formData.basis && formData.port) {
    updatedFlatDoc[`${documentTitle}.1. Subject of the Contract.content.basis`] =
      `The Seller has sold and the Buyer has bought on (${formData.basis}) ${formData.port} (port)`;
  }

  if (formData.goodsAmount) {
    updatedFlatDoc[`${documentTitle}.1. Subject of the Contract.content.details`] =
      `basis the goods to the amount of ${formData.goodsAmount}, in the quantity, assortment, at prices and according to technical conditions, as stated in Supplements N 1, 2... which are the integral parts of the present Contract.`;
  }

  // Update Price
  if (formData.currency && formData.basis) {
    updatedFlatDoc[`${documentTitle}.2. Price and Total Amount of the Contract.2.1.content`] =
      `The prices for the goods are fixed in ${formData.currency} and are understood ${formData.basis}, packing and marking included.`;
  }

  if (formData.totalAmount) {
    updatedFlatDoc[`${documentTitle}.2. Price and Total Amount of the Contract.2.2.content`] =
      `The Total Amount of the present Contract is ${formData.totalAmount}.`;
  }

  // Update Payment
  if (formData.paymentTerms) {
    updatedFlatDoc[`${documentTitle}.7. Payment.7.1.content`] = formData.paymentTerms;
  }

  // Update Arbitration
  if (formData.arbitration) {
    updatedFlatDoc[`${documentTitle}.9. Arbitration.content`] =
      `All disputes and differences which may arise out of the present Contract or in connection with the same are to be settled without application to State courts by ${formData.arbitration}, in accordance with the Rules of procedure of the said Court the awards of which are final and binding upon both Parties.`;
  }

  // Update Force Majeure
  if (formData.forceMajeurePeriod) {
    updatedFlatDoc[`${documentTitle}.10. Force-majeure.10.2.content`] =
      `Should the above circumstances continue to be in force for more than ${formData.forceMajeurePeriod} months, each Party shall have the right to refuse any further fulfilment of the obligations under the Contract and in such case neither of the Parties shall have the right to make a demand upon the other Party for the compensation of any possible damages.`;
  }

  // Update Legal Addresses
  if (formData.sellerAddress) {
    updatedFlatDoc[`${documentTitle}.12. Legal Addresses of the Parties.seller_address`] = formData.sellerAddress;
  }

  if (formData.buyerAddress) {
    updatedFlatDoc[`${documentTitle}.12. Legal Addresses of the Parties.buyer_address`] = formData.buyerAddress;
  }

  return updatedFlatDoc;
}

/**
 * Update the document preview
 */
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

/**
 * Enable editing mode for the document
 */
function enableEditing() {
  const previewElem = document.getElementById("documentPreview");
  if (!previewElem) return;
  previewElem.contentEditable = true;
  previewElem.style.border = "1px dashed #aaa";
  document.getElementById("insertContentButton").style.display = "inline-block";
  document.getElementById("enableEditingButton").style.display = "none";
}

/**
 * Open dialog for inserting new content
 */
function openInsertDialog() {
  document.getElementById("insertDialog").style.display = "block";
  document.getElementById("newKey").focus();
}

/**
 * Close dialog for inserting new content
 */
function closeInsertDialog() {
  document.getElementById("insertDialog").style.display = "none";
  document.getElementById("documentPreview").focus();
}

/**
 * Insert new content with styling options
 */
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

/**
 * Submit the questionnaire
 */
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

/**
 * Download document as Word DOCX
 */
function downloadWordDocx() {
  const content = document.getElementById("documentPreview").innerHTML;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Foreign Trade Contract</title>
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
          font-size: 14px;
          font-weight: bold;
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
        .document-title {
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 30px;
        }
        .main-section h5 {
          font-size: 16px;
          margin-top: 30px;
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
  link.download = "foreign-trade-contract.docx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Initialize event listeners for text selection
const docPreview = document.getElementById("documentPreview");
if (docPreview) {
  docPreview.addEventListener("mouseup", handleTextSelection);
  docPreview.addEventListener("keyup", handleTextSelection);
  docPreview.addEventListener("mouseup", saveSelection);
  docPreview.addEventListener("keyup", saveSelection);
}

// Expose functions to global scope
window.enableEditing = enableEditing;
window.openInsertDialog = openInsertDialog;
window.closeInsertDialog = closeInsertDialog;
window.insertNewContent = insertNewContent;
window.closeEditDialog = closeEditDialog;
window.submitAIEditRequest = submitAIEditRequest;
window.downloadWordDocx = downloadWordDocx;
window.showQuestionnaire = showQuestionnaire;
window.submitQuestionnaire = submitQuestionnaire;