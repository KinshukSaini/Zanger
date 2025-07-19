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

// Smart label detection patterns
const INTERNAL_FIELDS_TO_HIDE = ["content", "date", "terms", "responsibilities", "preamble"];
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

// Enhanced questionnaire with comprehensive questions
const documentQuestions = {
  step1: {
    title: "Agreement Date & Property Information",
    date: {
      question: "Enter the effective date of agreement",
      type: "date",
    },
    propertyAddress: {
      question: "Enter the complete property address to be managed",
      type: "textarea",
      placeholder: "Enter full property address including street, city, state and ZIP code"
    },
    agreedEndDate: {
      question: "Enter the end date of agreement",
      type: "date",
    },
  },
  step2: {
    title: "Owner Information",
    ownerType: {
      question: "Select type of Owner",
      type: "select",
      options: ["Individual", "Company", "Partnership"],
    },
    ownerName: {
      question: "Enter owner's full legal name",
      type: "text",
      showIf: "ownerType=Individual",
    },
    ownerCompanyName: {
      question: "Enter company name",
      type: "text",
      showIf: "ownerType=Company",
    },
    ownerPartnershipName: {
      question: "Enter partnership name",
      type: "text",
      showIf: "ownerType=Partnership",
    },
    ownerAddress: {
      question: "Enter owner's address",
      type: "textarea",
      showIf: "ownerType=Individual",
      placeholder: "Full address including city, state, ZIP"
    },
    ownerCompanyAddress: {
      question: "Enter company address",
      type: "textarea",
      showIf: "ownerType=Company",
      placeholder: "Full address including city, state, ZIP"
    },
    ownerPartnershipAddress: {
      question: "Enter partnership address",
      type: "textarea",
      showIf: "ownerType=Partnership",
      placeholder: "Full address including city, state, ZIP"
    },
    ownerSignatureDate: {
      question: "Enter owner's signature date",
      type: "date",
    },
  },
  step3: {
    title: "Agent Information",
    agentType: {
      question: "Select type of Agent",
      type: "select",
      options: ["Individual", "Company", "Partnership"],
    },
    agentName: {
      question: "Enter agent's full legal name",
      type: "text",
      showIf: "agentType=Individual",
    },
    agentCompanyName: {
      question: "Enter agency/company name",
      type: "text",
      showIf: "agentType=Company",
    },
    agentPartnershipName: {
      question: "Enter partnership name",
      type: "text",
      showIf: "agentType=Partnership",
    },
    agentAddress: {
      question: "Enter agent's address",
      type: "textarea",
      showIf: "agentType=Individual",
      placeholder: "Full address including city, state, ZIP"
    },
    agentCompanyAddress: {
      question: "Enter agency address",
      type: "textarea",
      showIf: "agentType=Company",
      placeholder: "Full address including city, state, ZIP"
    },
    agentPartnershipAddress: {
      question: "Enter partnership address",
      type: "textarea",
      showIf: "agentType=Partnership",
      placeholder: "Full address including city, state, ZIP"
    },
    agentSignatureDate: {
      question: "Enter agent's signature date",
      type: "date",
    },
  },
  step4: {
    title: "Management Terms & Responsibilities",
    repairLimit: {
      question: "Enter repair cost limit requiring owner approval ($)",
      type: "text",
      placeholder: "e.g., 500"
    },
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
    invoicePeriodNumber: {
      question: "Enter invoice frequency (number)",
      type: "text",
      placeholder: "e.g., 30"
    },
    invoicePeriodUnit: {
      question: "Select invoice frequency unit",
      type: "select",
      options: ["days", "months"],
    },
    paymentMethod: {
      question: "Specify payment method",
      type: "textarea",
      placeholder: "e.g., Bank transfer to account [number], Check payable to [name], etc."
    },
  },
  step5: {
    title: "Legal Terms & Dispute Resolution",
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
      question: "Select governing law jurisdiction",
      type: "select",
      options: ["UK", "England", "Scotland", "Wales", "Northern Ireland", "Enter your own"],
    },
    customGoverningLaw: {
      question: "Enter custom governing law jurisdiction",
      type: "text",
      placeholder: "e.g., Republic of Ireland, Jersey, Guernsey, etc.",
      showIf: "governingLaw=Enter your own",
    },
    disputeResolution: {
      question: "Select dispute resolution method",
      type: "select",
      options: ["Arbitration", "Mediation", "Negotiation"],
    },
    disputeResolutionJurisdiction: {
      question: "Select dispute resolution jurisdiction",
      type: "select",
      options: ["UK", "England", "Scotland", "Wales", "Northern Ireland", "Enter your own"],
    },
    customDisputeJurisdiction: {
      question: "Enter custom dispute resolution jurisdiction",
      type: "text",
      placeholder: "e.g., Republic of Ireland, Jersey, Guernsey, etc.",
      showIf: "disputeResolutionJurisdiction=Enter your own",
    }
  },
};

// Enhanced document path mapping for comprehensive field mapping
const documentPathMap = {
  // Agreement basics
  "date": ["Property Management Agreement.PARTIES.content"],
  "propertyAddress": ["Property Management Agreement.GENERAL.content"],
  "agreedEndDate": ["Property Management Agreement.TERM.content"],

  // Owner information - all types
  "ownerType": ["Property Management Agreement.PARTIES.content"],
  "ownerName": ["Property Management Agreement.PARTIES.content", "Property Management Agreement.SIGNATURE AND DATE.signature_blocks.owner.name_field"],
  "ownerCompanyName": ["Property Management Agreement.PARTIES.content", "Property Management Agreement.SIGNATURE AND DATE.signature_blocks.owner.name_field"],
  "ownerPartnershipName": ["Property Management Agreement.PARTIES.content", "Property Management Agreement.SIGNATURE AND DATE.signature_blocks.owner.name_field"],
  "ownerAddress": ["Property Management Agreement.PARTIES.content"],
  "ownerCompanyAddress": ["Property Management Agreement.PARTIES.content"],
  "ownerPartnershipAddress": ["Property Management Agreement.PARTIES.content"],
  "ownerSignatureDate": ["Property Management Agreement.SIGNATURE AND DATE.signature_blocks.owner.date_field"],

  // Agent information - all types
  "agentType": ["Property Management Agreement.PARTIES.content"],
  "agentName": ["Property Management Agreement.PARTIES.content", "Property Management Agreement.SIGNATURE AND DATE.signature_blocks.agent.name_field"],
  "agentCompanyName": ["Property Management Agreement.PARTIES.content", "Property Management Agreement.SIGNATURE AND DATE.signature_blocks.agent.name_field"],
  "agentPartnershipName": ["Property Management Agreement.PARTIES.content", "Property Management Agreement.SIGNATURE AND DATE.signature_blocks.agent.name_field"],
  "agentAddress": ["Property Management Agreement.PARTIES.content"],
  "agentCompanyAddress": ["Property Management Agreement.PARTIES.content"],
  "agentPartnershipAddress": ["Property Management Agreement.PARTIES.content"],
  "agentSignatureDate": ["Property Management Agreement.SIGNATURE AND DATE.signature_blocks.agent.date_field"],

  // Management terms
  "repairLimit": ["Property Management Agreement.THE RESPONSIBILITIES OF THE AGENT.responsibilities.6"],

  // Payment terms
  "paymentTotal": ["Property Management Agreement.PAYMENT AND FEES.terms.1"],
  "initialPayment": ["Property Management Agreement.PAYMENT AND FEES.terms.1"],
  "finalPayment": ["Property Management Agreement.PAYMENT AND FEES.terms.1"],
  "invoicePeriodNumber": ["Property Management Agreement.PAYMENT AND FEES.terms.2"],
  "invoicePeriodUnit": ["Property Management Agreement.PAYMENT AND FEES.terms.2"],
  "paymentMethod": ["Property Management Agreement.PAYMENT AND FEES.terms.3"],

  // Legal terms
  "breachPeriod": ["Property Management Agreement.TERMINATION.content"],
  "vacancyPeriod": ["Property Management Agreement.TERMINATION.content"],
  "governingLaw": ["Property Management Agreement.GOVERNING LAW.content"],
  "customGoverningLaw": ["Property Management Agreement.GOVERNING LAW.content"],
  "disputeResolution": ["Property Management Agreement.ALTERNATIVE DISPUTE RESOLUTION.content"],
  "disputeResolutionJurisdiction": ["Property Management Agreement.ALTERNATIVE DISPUTE RESOLUTION.content"],
  "customDisputeJurisdiction": ["Property Management Agreement.ALTERNATIVE DISPUTE RESOLUTION.content"]
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
    window.currentDocument = { "Property Management Agreement": {} };
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
 * Enhanced document to HTML conversion with proper legal formatting
 */
function convertToHtml(document) {
  let html = [];
  const documentTitle = Object.keys(document)[0];

  if (documentTitle) {
    // Center-aligned document title
    html.push(
      `<div class="document-title" style="text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 20px;">
        <strong>${documentTitle}</strong>
      </div>`
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

    // Main section headers
    if (isMainSection) {
      html.push(
        `<div class="document-line ${sectionClass}" data-path="${currentPath}" style="margin-left: ${marginLeft}px;">
          <h5 style="text-decoration: underline; font-weight: bold; margin: 15px 0 10px 0;">
            ${key}
          </h5>
        </div>`
      );
    }

    if (typeof value === "object" && value !== null) {
      let keys = Object.keys(value);

      keys.forEach((subKey) => {
        const subValue = value[subKey];
        const subMarginLeft = marginLeft + 20;

        // Handle different content types
        if (subValue && typeof subValue === "object") {
          if (subValue.content !== undefined) {
            // Regular content
            html.push(
              `<div class="document-line document-content" data-path="${currentPath}.${subKey}" style="margin-left: ${subMarginLeft}px;">
                <span data-value-path="${currentPath}.${subKey}.content">
                  ${subValue.content}
                </span>
              </div>`
            );
          } else if (subKey === "signature_blocks") {
            // Enhanced signature blocks formatting
            html.push(
              `<div class="document-line document-content" style="margin-left: ${subMarginLeft}px;">
                <p>The Parties hereby agree to the terms and conditions set forth in this Agreement and such is demonstrated throughout by their signatures below:</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                  <tr>
                    <td style="width: 50%; vertical-align: top; padding: 15px; border: 1px solid #333; text-align: center;">
                      <strong>OWNER</strong><br><br>
                      <span data-value-path="${currentPath}.${subKey}.owner.name_field">${subValue.owner.name_field}</span><br><br>
                      <span data-value-path="${currentPath}.${subKey}.owner.signature_field">${subValue.owner.signature_field}</span><br><br>
                      <span data-value-path="${currentPath}.${subKey}.owner.date_field">${subValue.owner.date_field}</span>
                    </td>
                    <td style="width: 50%; vertical-align: top; padding: 15px; border: 1px solid #333; text-align: center;">
                      <strong>AGENT</strong><br><br>
                      <span data-value-path="${currentPath}.${subKey}.agent.name_field">${subValue.agent.name_field}</span><br><br>
                      <span data-value-path="${currentPath}.${subKey}.agent.signature_field">${subValue.agent.signature_field}</span><br><br>
                      <span data-value-path="${currentPath}.${subKey}.agent.date_field">${subValue.agent.date_field}</span>
                    </td>
                  </tr>
                </table>
              </div>`
            );
          } else if (subKey === "terms" || subKey === "responsibilities") {
            // Handle numbered/bulleted lists
            Object.entries(subValue).forEach(([itemKey, itemValue]) => {
              const shouldShowLabel = !INTERNAL_FIELDS_TO_HIDE.includes(itemKey);
              const formattedLabel = formatLabel(itemKey);

              html.push(
                `<div class="document-line document-content" data-path="${currentPath}.${subKey}.${itemKey}" style="margin-left: ${subMarginLeft + 20}px;">
                  ${shouldShowLabel ? `<strong>${formattedLabel}</strong> ` : ''}
                  <span data-value-path="${currentPath}.${subKey}.${itemKey}">${itemValue}</span>
                </div>`
              );
            });
          } else {
            // Recursive processing for nested objects
            processSection(subKey, subValue, level + 1, currentPath);
          }
        } else if (typeof subValue === "string") {
          // Handle string values
          const shouldShowLabel = !INTERNAL_FIELDS_TO_HIDE.includes(subKey);
          const formattedLabel = formatLabel(subKey);

          html.push(
            `<div class="document-line document-content" data-path="${currentPath}.${subKey}" style="margin-left: ${subMarginLeft}px;">
              ${shouldShowLabel ? `<strong>${formattedLabel}</strong> ` : ''}
              <span data-value-path="${currentPath}.${subKey}">${subValue}</span>
            </div>`
          );
        }
      });
    }
  }

  function formatLabel(key) {
    if (NUMBERED_PATTERN.test(key)) {
      return `${key}.`;
    } else if (CLAUSE_PATTERN.test(key)) {
      return `${key}:`;
    } else if (LETTER_PATTERN.test(key)) {
      return `(${key})`;
    }
    return key;
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

  container.innerHTML = allQuestionsHTML;

  // Add comprehensive event handlers
  document
    .querySelectorAll("#keyContainer input, #keyContainer select, #keyContainer textarea")
    .forEach((input) => {
      input.addEventListener("input", function () {
        formDataStore[this.id] = this.value;

        if (this.id === "ownerType" || this.id === "agentType") {
          handlePartyTypeChange(this);
        } else if (this.id === "disputeResolution") {
          handleDisputeResolutionChange(this);
        } else if (this.id === "governingLaw" || this.id === "disputeResolutionJurisdiction") {
          handleJurisdictionChange(this);
        } else if (this.id === "invoicePeriodUnit" || this.id === "invoicePeriodNumber") {
          handleInvoicePeriodChange();
        } else if (this.tagName === "SELECT") {
          handleFieldChange(this);
        } else {
          updateDocumentWithFormData(formDataStore);
          updatePreview();
        }
      });
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
    const [condition, value] = data.showIf.split("=");
    visibilityAttr = `data-show-if="${condition}" data-show-value="${value}" style="display: none;"`;
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
  // Special handlers for complex fields
  if (key === "ownerType" || key === "agentType") {
    return `
      <select id="${key}" onchange="handlePartyTypeChange(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
      </select>
    `;
  } else if (key === "disputeResolution") {
    return `
      <select id="${key}" onchange="handleDisputeResolutionChange(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
      </select>
    `;
  } else if (key === "governingLaw" || key === "disputeResolutionJurisdiction") {
    return `
      <select id="${key}" onchange="handleJurisdictionChange(this)" ${affectedPaths}>
        <option value="">Select...</option>
        ${data.options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
      </select>
    `;
  } else if (key === "invoicePeriodUnit") {
    return `
      <select id="${key}" onchange="handleInvoicePeriodChange()" ${affectedPaths}>
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

function handleFieldChange(element) {
  formDataStore[element.id] = element.value;

  const condition = element.id;
  const value = element.value;

  document.querySelectorAll(`[data-show-if="${condition}"]`).forEach((field) => {
    const showValue = field.getAttribute("data-show-value");
    field.style.display = field.dataset.showValue === value ? "block" : "none";
  });

  updateDocumentWithFormData(formDataStore);
  updatePreview();
}

function handlePartyTypeChange(selectElement) {
  const isOwner = selectElement.id === "ownerType";
  const selectedType = selectElement.value;

  if (!selectedType) return;

  // Clear previous values for other types
  if (isOwner) {
    if (selectedType === "Individual") {
      delete formDataStore["ownerCompanyName"];
      delete formDataStore["ownerCompanyAddress"];
      delete formDataStore["ownerPartnershipName"];
      delete formDataStore["ownerPartnershipAddress"];
    } else if (selectedType === "Company") {
      delete formDataStore["ownerName"];
      delete formDataStore["ownerAddress"];
      delete formDataStore["ownerPartnershipName"];
      delete formDataStore["ownerPartnershipAddress"];
    } else if (selectedType === "Partnership") {
      delete formDataStore["ownerName"];
      delete formDataStore["ownerAddress"];
      delete formDataStore["ownerCompanyName"];
      delete formDataStore["ownerCompanyAddress"];
    }
  } else {
    if (selectedType === "Individual") {
      delete formDataStore["agentCompanyName"];
      delete formDataStore["agentCompanyAddress"];
      delete formDataStore["agentPartnershipName"];
      delete formDataStore["agentPartnershipAddress"];
    } else if (selectedType === "Company") {
      delete formDataStore["agentName"];
      delete formDataStore["agentAddress"];
      delete formDataStore["agentPartnershipName"];
      delete formDataStore["agentPartnershipAddress"];
    } else if (selectedType === "Partnership") {
      delete formDataStore["agentName"];
      delete formDataStore["agentAddress"];
      delete formDataStore["agentCompanyName"];
      delete formDataStore["agentCompanyAddress"];
    }
  }

  formDataStore[selectElement.id] = selectedType;

  // Handle UI visibility
  document.querySelectorAll(`[data-show-if="${selectElement.id}"]`).forEach((field) => {
    const showValue = field.getAttribute("data-show-value");
    field.style.display = showValue === selectedType ? "block" : "none";
  });

  updateDocumentWithFormData(formDataStore);
  updatePreview();
  highlightDocumentSection(selectElement.id);

  // Focus next field
  setTimeout(() => {
    const visibleFields = document.querySelectorAll(
      `[data-show-if="${selectElement.id}"][data-show-value="${selectedType}"]:not([style*="display: none"]) input, 
       [data-show-if="${selectElement.id}"][data-show-value="${selectedType}"]:not([style*="display: none"]) textarea`
    );

    if (visibleFields.length > 0) {
      visibleFields[0].focus();
    }
  }, 200);
}

function handleJurisdictionChange(selectElement) {
  formDataStore[selectElement.id] = selectElement.value;

  // Handle conditional field visibility for custom jurisdiction
  const condition = selectElement.id;
  const value = selectElement.value;

  document.querySelectorAll(`[data-show-if="${condition}"]`).forEach((field) => {
    const showValue = field.getAttribute("data-show-value");
    field.style.display = showValue === value ? "block" : "none";
  });

  updateDocumentWithFormData(formDataStore);
  updatePreview();
  highlightDocumentSection(selectElement.id);
}

function handleDisputeResolutionChange(selectElement) {
  formDataStore[selectElement.id] = selectElement.value;
  updateDocumentWithFormData(formDataStore);
  updatePreview();
  highlightDocumentSection(selectElement.id);
}

function handleInvoicePeriodChange() {
  const number = formDataStore["invoicePeriodNumber"];
  const unit = formDataStore["invoicePeriodUnit"];

  if (number && unit) {
    updateDocumentWithFormData(formDataStore);
    updatePreview();
  }
}

function restoreStepData(stepNumber) {
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && formDataStore[input.id]) {
      input.value = formDataStore[input.id];

      if (input.tagName === "SELECT") {
        if (input.id === "ownerType" || input.id === "agentType") {
          handlePartyTypeChange(input);
        } else if (input.id === "disputeResolution") {
          handleDisputeResolutionChange(input);
        } else if (input.id === "governingLaw" || input.id === "disputeResolutionJurisdiction") {
          handleJurisdictionChange(input);
        } else {
          handleFieldChange(input);
        }
      }
    }
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${month}/${day}/${year}`;
}

/**
 * Enhanced form data to document mapping
 */
function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };
  const documentTitle = Object.keys(window.currentDocument)[0] || "Property Management Agreement";

  // PARTIES section - enhanced for all party types
  if (formData.date || formData.ownerName || formData.ownerCompanyName || formData.ownerPartnershipName ||
      formData.agentName || formData.agentCompanyName || formData.agentPartnershipName) {
    const partiesKey = `${documentTitle}.PARTIES.content`;
    let partiesContent = "This Property Management Agreement (hereinafter referred to as the \"Agreement\") is entered into on ";

    partiesContent += formData.date ? formatDate(formData.date) : "_______________";
    partiesContent += " (the \"Effective Date\"), by and between ";

    // Enhanced owner info handling
    if (formData.ownerType === "Individual") {
      partiesContent += formData.ownerName || "_________________________";
      partiesContent += ", with an address of ";
      partiesContent += formData.ownerAddress || "__________________";
    } else if (formData.ownerType === "Company") {
      partiesContent += formData.ownerCompanyName || "_________________________";
      partiesContent += ", with an address of ";
      partiesContent += formData.ownerCompanyAddress || "__________________";
    } else if (formData.ownerType === "Partnership") {
      partiesContent += formData.ownerPartnershipName || "_________________________";
      partiesContent += ", with an address of ";
      partiesContent += formData.ownerPartnershipAddress || "__________________";
    } else {
      partiesContent += "_________________________, with an address of __________________";
    }

    partiesContent += " (hereinafter referred to as the \"Owner\"), and ";

    // Enhanced agent info handling
    if (formData.agentType === "Individual") {
      partiesContent += formData.agentName || "__________________";
      partiesContent += ", with an address of ";
      partiesContent += formData.agentAddress || "__________________";
    } else if (formData.agentType === "Company") {
      partiesContent += formData.agentCompanyName || "__________________";
      partiesContent += ", with an address of ";
      partiesContent += formData.agentCompanyAddress || "__________________";
    } else if (formData.agentType === "Partnership") {
      partiesContent += formData.agentPartnershipName || "__________________";
      partiesContent += ", with an address of ";
      partiesContent += formData.agentPartnershipAddress || "__________________";
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
    termContent += formData.agreedEndDate ? formatDate(formData.agreedEndDate) : "________________________________";
    termContent += ".";
    updatedFlatDoc[termKey] = termContent;
  }

  // RESPONSIBILITIES section
  if (formData.repairLimit) {
    const responsibilityKey = `${documentTitle}.THE RESPONSIBILITIES OF THE AGENT.responsibilities.6`;
    let responsibilityContent = "To inform the Owner of any improvements and repairs that exceed ";
    responsibilityContent += formData.repairLimit || "_________________";
    responsibilityContent += " and to obtain consent from the Owner prior to paying such fees.";
    updatedFlatDoc[responsibilityKey] = responsibilityContent;
  }

  // PAYMENT AND FEES section - enhanced
  if (formData.paymentTotal || formData.initialPayment || formData.finalPayment) {
    const paymentKey1 = `${documentTitle}.PAYMENT AND FEES.terms.1`;
    let paymentContent1 = "The Parties agree that the total cost of the services will be ";
    paymentContent1 += formData.paymentTotal || "_________________";
    paymentContent1 += ", where ";
    paymentContent1 += formData.initialPayment || "______________";
    paymentContent1 += " will be paid at the signing of this Agreement and ";
    paymentContent1 += formData.finalPayment || "______________";
    paymentContent1 += " will be paid at completion.";
    updatedFlatDoc[paymentKey1] = paymentContent1;
  }

  if (formData.invoicePeriodNumber || formData.invoicePeriodUnit) {
    const paymentKey2 = `${documentTitle}.PAYMENT AND FEES.terms.2`;
    let paymentContent2 = "The Parties agree that the Agent will provide an invoice to the Owner every ";

    if (formData.invoicePeriodNumber && formData.invoicePeriodUnit) {
      paymentContent2 += `${formData.invoicePeriodNumber} ${formData.invoicePeriodUnit}`;
    } else {
      paymentContent2 += "______________ days/months";
    }

    paymentContent2 += " for the Services he/she completes.";
    updatedFlatDoc[paymentKey2] = paymentContent2;
  }

  if (formData.paymentMethod) {
    const paymentKey3 = `${documentTitle}.PAYMENT AND FEES.terms.3`;
    let paymentContent3 = "The Parties agree that the means of payment will be via ";
    paymentContent3 += formData.paymentMethod || "___________________________________________________________________________________________________________________________________________________________________________";
    paymentContent3 += ".";
    updatedFlatDoc[paymentKey3] = paymentContent3;
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
  if (formData.governingLaw || formData.customGoverningLaw) {
    const lawKey = `${documentTitle}.GOVERNING LAW.content`;
    let lawContent = "This Agreement shall be governed by and construed in accordance with the laws of ";

    // Use custom jurisdiction if "Enter your own" was selected, otherwise use dropdown selection
    const jurisdiction = formData.governingLaw === "Enter your own" ?
                        (formData.customGoverningLaw || "_________________") :
                        (formData.governingLaw || "_________________");

    lawContent += jurisdiction;
    lawContent += ".";
    updatedFlatDoc[lawKey] = lawContent;
  }

  // ALTERNATIVE DISPUTE RESOLUTION section
  if (formData.disputeResolution || formData.disputeResolutionJurisdiction || formData.customDisputeJurisdiction) {
    const adrKey = `${documentTitle}.ALTERNATIVE DISPUTE RESOLUTION.content`;
    let adrContent = "Any dispute or difference whatsoever arising out of or in connection with this Agreement shall be submitted to ";

    if (formData.disputeResolution) {
      adrContent += formData.disputeResolution;
    } else {
      adrContent += "_________________ (Arbitration/mediation/negotiation) (Circle one)";
    }

    adrContent += " in accordance with, and subject to the laws of, ";

    // Use custom jurisdiction if "Enter your own" was selected, otherwise use dropdown selection
    const disputeJurisdiction = formData.disputeResolutionJurisdiction === "Enter your own" ?
                               (formData.customDisputeJurisdiction || "_________________") :
                               (formData.disputeResolutionJurisdiction || "_________________");

    adrContent += disputeJurisdiction;
    adrContent += ".";
    updatedFlatDoc[adrKey] = adrContent;
  }

  // SIGNATURE section - enhanced for all party types
  const getPartyName = (type, formData, prefix) => {
    if (type === "Individual") return formData[`${prefix}Name`];
    if (type === "Company") return formData[`${prefix}CompanyName`];
    if (type === "Partnership") return formData[`${prefix}PartnershipName`];
    return null;
  };

  const ownerName = getPartyName(formData.ownerType, formData, "owner");
  const agentName = getPartyName(formData.agentType, formData, "agent");

  if (ownerName) {
    const ownerNameKey = `${documentTitle}.SIGNATURE AND DATE.signature_blocks.owner.name_field`;
    updatedFlatDoc[ownerNameKey] = `Name: ${ownerName}`;
  }

  if (agentName) {
    const agentNameKey = `${documentTitle}.SIGNATURE AND DATE.signature_blocks.agent.name_field`;
    updatedFlatDoc[agentNameKey] = `Name: ${agentName}`;
  }

  if (formData.ownerSignatureDate) {
    const ownerDateKey = `${documentTitle}.SIGNATURE AND DATE.signature_blocks.owner.date_field`;
    updatedFlatDoc[ownerDateKey] = `Date: ${formatDate(formData.ownerSignatureDate)}`;
  }

  if (formData.agentSignatureDate) {
    const agentDateKey = `${documentTitle}.SIGNATURE AND DATE.signature_blocks.agent.date_field`;
    updatedFlatDoc[agentDateKey] = `Date: ${formatDate(formData.agentSignatureDate)}`;
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
      <title>Property Management Agreement</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #333;
          margin: 1in;
        }
        .document-title {
          text-align: center;
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 20pt;
        }
        h5 {
          font-size: 14pt;
          font-weight: bold;
          margin-top: 20pt;
          margin-bottom: 10pt;
          text-decoration: underline;
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
          border: 1px solid #333;
          padding: 15pt;
          vertical-align: top;
          text-align: center;
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
window.handleFieldChange = handleFieldChange;
window.handlePartyTypeChange = handlePartyTypeChange;
window.handleDisputeResolutionChange = handleDisputeResolutionChange;
window.handleJurisdictionChange = handleJurisdictionChange;
window.handleInvoicePeriodChange = handleInvoicePeriodChange;
window.highlightDocumentSection = highlightDocumentSection;
window.clearHighlights = clearHighlights;
window.closeEditDialog = closeEditDialog;
window.toggleEditMode = toggleEditMode;
window.downloadWordDocx = downloadWordDocx;