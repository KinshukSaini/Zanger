// Terms and Conditions document order configuration
const sectionOrder = [
  "TITLE",
  "INTRODUCTION", 
  "INTELLECTUAL PROPERTY",
  "AGE RESTRICTIONS",
  "POLICY ON ACCEPTABLE USE OF THE WEBSITE",
  "USER CONTRIBUTIONS",
  "ACCOUNTS AND ACCOUNT RESPONSIBILITIES",
  "SALE OF GOODS [AND/OR]/SERVICES",
  "SUBSCRIPTIONS",
  "PAYMENTS",
  "SHIPPING AND DELIVERY",
  "CANCELLATION POLICY",
  "REFUNDS",
  "RETURNS",
  "CONSUMER PROTECTION LAW",
  "ADDITIONAL TERMS",
  "CONTACT DETAILS",
  "EFFECTIVE DATE"
];

// Smart label detection patterns - fields that shouldn't show as headers
const INTERNAL_FIELDS_TO_HIDE = [];

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

// Comprehensive questionnaire for Terms and Conditions
const documentQuestions = {
  step1: {
    title: "Website & Owner Information",
    websiteDomain: {
      question: "Enter your website domain",
      type: "text",
      placeholder: "e.g., www.yourwebsite.com"
    },
    websiteOwnerName: {
      question: "Enter website owner's name",
      type: "text",
      placeholder: "e.g., Your Company Name Ltd"
    },
    minimumAge: {
      question: "Enter minimum age to use the website",
      type: "select",
      options: ["13", "16", "18", "21"]
    }
  },
  step2: {
    title: "Usage Policies & Account Management",
    prohibitedUses: {
      question: "Enter prohibited uses of your website",
      type: "textarea",
      placeholder: "e.g., Spamming, harassment, illegal content distribution, copyright infringement, etc."
    },
    userContributionPolicy: {
      question: "Enter your user contribution policy",
      type: "textarea", 
      placeholder: "e.g., Users may post comments, reviews, images. All content must be appropriate and non-offensive."
    },
    accountResponsibility: {
      question: "Enter account responsibility statement",
      type: "textarea",
      placeholder: "e.g., Users are responsible for account security, password confidentiality, and all activities under their account"
    },
    suspensionRights: {
      question: "Enter account suspension/termination policy",
      type: "textarea",
      placeholder: "e.g., We may suspend accounts for violations, illegal activities, or security breaches without prior notice"
    }
  },
  step3: {
    title: "Products, Services & Payment Terms",
    businessType: {
      question: "What does your website offer?",
      type: "select",
      options: ["Goods only", "Services only", "Both goods and services"]
    },
    goodsServices: {
      question: "List the goods and/or services available",
      type: "textarea",
      placeholder: "e.g., Digital products, consulting services, physical merchandise, software licenses, etc."
    },
    paymentMethods: {
      question: "List available payment methods",
      type: "textarea",
      placeholder: "e.g., Credit cards (Visa, MasterCard), PayPal, bank transfer, Apple Pay, Google Pay, etc."
    },
    paymentTerms: {
      question: "Enter your payment terms policy",
      type: "textarea",
      placeholder: "e.g., Payment due upon completion of service, advance payment required, payment within 30 days, etc."
    }
  },
  step4: {
    title: "Delivery & Returns",
    hasPhysicalGoods: {
      question: "Do you sell physical goods that require shipping?",
      type: "select",
      options: ["Yes", "No"]
    },
    shippingMethods: {
      question: "Describe your shipping and delivery methods",
      type: "textarea",
      placeholder: "e.g., Standard shipping 3-5 days (£5), Express shipping 1-2 days (£15), Free shipping over £50, etc.",
      showIf: "hasPhysicalGoods=Yes"
    },
    hasPhysicalStores: {
      question: "Do you have physical retail stores for returns?",
      type: "select", 
      options: ["Yes", "No"]
    },
    storeLocations: {
      question: "Enter your retail store locations",
      type: "textarea",
      placeholder: "e.g., 123 Main Street, London, UK SW1A 1AA; 456 High Street, Manchester, UK M1 1AA",
      showIf: "hasPhysicalStores=Yes"
    }
  },
  step5: {
    title: "Policies, Cancellations & Returns",
    refundPolicy: {
      question: "Enter your refund policy and reasons",
      type: "textarea",
      placeholder: "e.g., Defective products, wrong items received, customer dissatisfaction within 30 days, digital products within 14 days if not downloaded"
    },
    hasSubscriptions: {
      question: "Do you offer subscription services?",
      type: "select",
      options: ["Yes", "No"]
    },
    subscriptionCancelDays: {
      question: "Days required to cancel subscription before renewal",
      type: "select",
      options: ["1", "3", "7", "14", "30"],
      showIf: "hasSubscriptions=Yes"
    },
    refundBusinessDays: {
      question: "Business days for processing refunds",
      type: "select",
      options: ["3", "5", "7", "10", "14"]
    },
    cancellationExceptions: {
      question: "List goods exempt from cancellation rights (optional)",
      type: "textarea",
      placeholder: "e.g., Personalized items, perishable goods, digital downloads after access, sealed audio/video recordings if opened"
    },
    cancellationExceptionsPolicy: {
      question: "Enter cancellation exceptions policy statement",  
      type: "textarea",
      placeholder: "e.g., Cancellation rights do not apply to custom orders, downloaded software, or services already provided"
    },
    reimbursementPolicy: {
      question: "Enter reimbursement method policy",
      type: "textarea", 
      placeholder: "e.g., Refunds processed using original payment method, no additional fees charged, alternative methods available by agreement"
    }
  },
  step6: {
    title: "Contact & Legal",
    contactDetails: {
      question: "Enter your complete contact details",
      type: "textarea",
      placeholder: "e.g., Email: contact@website.com, Phone: +44 123 456 7890, Address: 123 Business Street, London, UK SW1A 1AA"
    },
    additionalTerms: {
      question: "Enter any additional terms (optional)",
      type: "textarea",
      placeholder: "Any specific terms unique to your business, privacy policy references, etc."
    },
    effectiveDate: {
      question: "Enter the effective date of these terms",
      type: "date"
    }
  }
};

// Document path mapping for form fields to JSON paths
const documentPathMap = {
  // Basic info
  "websiteDomain": ["Terms and Conditions.INTRODUCTION.content"],
  "websiteOwnerName": [
    "Terms and Conditions.INTRODUCTION.content",
    "Terms and Conditions.INTELLECTUAL PROPERTY.content"
  ],
  "minimumAge": ["Terms and Conditions.AGE RESTRICTIONS.content"],

  // Policies & Account Management
  "prohibitedUses": ["Terms and Conditions.POLICY ON ACCEPTABLE USE OF THE WEBSITE.prohibited_uses"],
  "userContributionPolicy": ["Terms and Conditions.USER CONTRIBUTIONS.policy"],
  "accountResponsibility": ["Terms and Conditions.ACCOUNTS AND ACCOUNT RESPONSIBILITIES.account_responsibility.content"],
  "suspensionRights": ["Terms and Conditions.ACCOUNTS AND ACCOUNT RESPONSIBILITIES.suspension_rights.content"],

  // Business & Payment
  "businessType": ["Terms and Conditions.SALE OF GOODS [AND/OR]/SERVICES.content"],
  "goodsServices": ["Terms and Conditions.SALE OF GOODS [AND/OR]/SERVICES.available_items.list"],
  "paymentMethods": ["Terms and Conditions.PAYMENTS.methods"],
  "paymentTerms": ["Terms and Conditions.SALE OF GOODS [AND/OR]/SERVICES.payment_terms.content"],

  // Delivery & Returns
  "hasPhysicalGoods": ["Terms and Conditions.SHIPPING AND DELIVERY.content"],
  "shippingMethods": ["Terms and Conditions.SHIPPING AND DELIVERY.methods"],
  "hasPhysicalStores": ["Terms and Conditions.RETURNS.content"],
  "storeLocations": ["Terms and Conditions.RETURNS.content"],
  
  // Policies & Cancellations
  "refundPolicy": ["Terms and Conditions.REFUNDS.policy"],
  "hasSubscriptions": ["Terms and Conditions.SUBSCRIPTIONS.content"],
  "cancellationExceptions": ["Terms and Conditions.CANCELLATION POLICY.additional_exceptions.list"],
  "cancellationExceptionsPolicy": ["Terms and Conditions.CANCELLATION POLICY.exceptions.content"],
  "reimbursementPolicy": ["Terms and Conditions.CANCELLATION POLICY.reimbursement.content"],

  // Subscriptions & Processing
  "subscriptionCancelDays": ["Terms and Conditions.SUBSCRIPTIONS.content"],
  "refundBusinessDays": ["Terms and Conditions.SALE OF GOODS [AND/OR]/SERVICES.order_rights.content"],

  // Contact & Legal
  "contactDetails": [
    "Terms and Conditions.CONTACT DETAILS.details",
    "Terms and Conditions.SALE OF GOODS [AND/OR]/SERVICES.order_rights.content"
  ],
  "additionalTerms": ["Terms and Conditions.ADDITIONAL TERMS.content"],
  "effectiveDate": ["Terms and Conditions.EFFECTIVE DATE.content"]
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
  console.log("Terms and Conditions document initialization started");
  if (!window.currentDocument) {
    console.error("No document found in window.currentDocument");
    window.currentDocument = { "Terms and Conditions": {} };
  }

  try {
    initializeDocumentTemplate();
    showQuestionnaire();
    updatePreview();
    setTimeout(() => {
      registerHighlightEvents();
      // Force initial update to show all placeholders
      updateDocumentWithFormData(formDataStore);
      updatePreview();
    }, 500);

    const previewElem = document.getElementById("documentPreview");
    if (previewElem) {
      previewElem.addEventListener("mouseup", handleTextSelection);
      previewElem.addEventListener("keyup", handleTextSelection);
    }

    console.log("Terms and Conditions document initialization completed");
  } catch (error) {
    console.error("Error during initialization:", error);
  }
});

/**
 * Enhanced document to HTML conversion with proper formatting
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
    const isMainSection = sectionOrder.includes(key);

    if (key === "TITLE") {
      // Document title - centered and bold
      html.push(
        `<div class="document-title" style="text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 30px; text-transform: uppercase;">
          <span data-value-path="${currentPath}.content">${value.content}</span>
        </div>`
      );
      return; // Exit early to prevent processing content again
    } else if (isMainSection) {
      // Main section headers - bold and uppercase
      html.push(
        `<div class="section-header" style="font-weight: bold; font-size: 14px; margin-top: 25px; margin-bottom: 15px; text-transform: uppercase;">
          ${key}
        </div>`
      );
    }

    // Process section content
    if (typeof value === "object" && value !== null) {
      Object.keys(value).forEach(subKey => {
        const subValue = value[subKey];
        processSubSection(subKey, subValue, currentPath, key);
      });
    }
  }

  function processSubSection(key, value, parentPath, parentKey) {
    const currentPath = `${parentPath}.${key}`;

    if (typeof value === "string") {
      if (!INTERNAL_FIELDS_TO_HIDE.includes(key) || key === "content") {
        // Regular content paragraph
        html.push(
          `<div class="document-content" data-path="${currentPath}" style="margin-bottom: 15px; line-height: 1.6;">
            <span data-value-path="${currentPath}">${value}</span>
          </div>`
        );
      }
    } else if (typeof value === "object" && value !== null) {
      // Handle special cases for specific sections
      if (parentKey === "INTRODUCTION" && key === "confirmation") {
        html.push(
          `<div class="document-content" data-path="${currentPath}" style="margin-bottom: 15px; line-height: 1.6;">
            <span data-value-path="${currentPath}">${value}</span>
          </div>`
        );
      } else if (parentKey === "POLICY ON ACCEPTABLE USE OF THE WEBSITE") {
        if (key === "prohibited_uses") {
          html.push(
            `<div class="document-content" data-path="${currentPath}" style="margin-bottom: 15px; line-height: 1.6;">
              <span data-value-path="${currentPath}">${value}</span>
            </div>`
          );
        } else if (key === "rights_reserved") {
          html.push(
            `<div class="document-content" data-path="${currentPath}" style="margin-bottom: 15px; line-height: 1.6;">
              <span data-value-path="${currentPath}">${value}</span>
            </div>`
          );
        }
      } else if (parentKey === "USER CONTRIBUTIONS" && key === "policy") {
        html.push(
          `<div class="document-content" data-path="${currentPath}" style="margin-bottom: 15px; line-height: 1.6;">
            <span data-value-path="${currentPath}">${value}</span>
          </div>`
        );
      } else {
        // Handle nested objects (like account_responsibility, available_items, etc.)
        if (key !== "content") {
          // Sub-section header if not just content
          const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          html.push(
            `<div class="sub-section-header" style="font-weight: bold; margin-top: 15px; margin-bottom: 8px;">
              ${formattedKey}:
            </div>`
          );
        }
        
        // Process nested content
        Object.keys(value).forEach(nestedKey => {
          const nestedValue = value[nestedKey];
          if (typeof nestedValue === "string") {
            html.push(
              `<div class="document-content" data-path="${currentPath}.${nestedKey}" style="margin-bottom: 12px; line-height: 1.6;">
                <span data-value-path="${currentPath}.${nestedKey}">${nestedValue}</span>
              </div>`
            );
          } else if (typeof nestedValue === "object" && nestedValue !== null) {
            // Handle deeper nesting (like cancellation exceptions)
            Object.keys(nestedValue).forEach(deepKey => {
              const deepValue = nestedValue[deepKey];
              if (typeof deepValue === "string") {
                html.push(
                  `<div class="document-content" data-path="${currentPath}.${nestedKey}.${deepKey}" style="margin-bottom: 12px; line-height: 1.6;">
                    <span data-value-path="${currentPath}.${nestedKey}.${deepKey}">${deepValue}</span>
                  </div>`
                );
              }
            });
          }
        });
      }
    }
  }
}

function showQuestionnaire() {
  const container = document.getElementById("keyContainer");
  container.innerHTML = "";

  let allQuestionsHTML = "";
  
  // Create all steps
  for (let stepNumber = 1; stepNumber <= 6; stepNumber++) {
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
  document.querySelectorAll("#keyContainer input, #keyContainer select, #keyContainer textarea").forEach((input) => {
    input.addEventListener("input", function () {
      formDataStore[this.id] = this.value;

      // Handle conditional fields including Yes/No selections
      if (this.id === "hasPhysicalGoods" || this.id === "hasPhysicalStores" || 
          this.id === "hasSubscriptions") {
        handleConditionalFieldChange(this);
      } else {
        updateDocumentWithFormData(formDataStore);
        updatePreview();
      }
    });

    // Add change event for select elements to ensure highlighting works
    input.addEventListener("change", function () {
      formDataStore[this.id] = this.value;
      highlightDocumentSection(this.id);
      
      if (this.id === "hasPhysicalGoods" || this.id === "hasPhysicalStores" || 
          this.id === "hasSubscriptions") {
        handleConditionalFieldChange(this);
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

  let visibilityAttr = "";
  if (data.showIf) {
    const [condition, value] = data.showIf.split("=");
    visibilityAttr = `data-show-if="${condition}" data-show-value="${value}" style="display: none;"`;
  }

  const affectedPaths = documentPathMap[key] ? 
    `data-affects-path="${documentPathMap[key].join(',')}"` : "";

  switch (data.type) {
    case "textarea":
      return `
        <div class="question-field ${sectionClass}" ${visibilityAttr}>
          <label>${data.question}</label>
          <textarea id="${key}" class="form-textarea" placeholder="${data.placeholder || ''}" ${affectedPaths}></textarea>
        </div>
      `;
    case "date":
      return `
        <div class="question-field ${sectionClass}" ${visibilityAttr}>
          <label>${data.question}</label>
          <input type="date" id="${key}" ${affectedPaths}>
        </div>
      `;
    case "select":
      return `
        <div class="question-field ${sectionClass}" ${visibilityAttr}>
          <label>${data.question}</label>
          <select id="${key}" ${affectedPaths}>
            <option value="">Select...</option>
            ${data.options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
          </select>
        </div>
      `;
    default:
      return `
        <div class="question-field ${sectionClass}" ${visibilityAttr}>
          <label>${data.question}</label>
          <input type="text" id="${key}" placeholder="${data.placeholder || ''}" ${affectedPaths}>
        </div>
      `;
  }
}

function handleConditionalFieldChange(selectElement) {
  formDataStore[selectElement.id] = selectElement.value;

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

function restoreFormData() {
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (input.id && formDataStore[input.id]) {
      input.value = formDataStore[input.id];

      if (input.tagName === "SELECT" && 
          (input.id === "hasPhysicalGoods" || input.id === "hasPhysicalStores" || input.id === "hasSubscriptions")) {
        handleConditionalFieldChange(input);
      }
    }
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "_______ day of _________________, _______.";
  
  const date = new Date(dateStr);
  const day = date.getDate();
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} day of ${month}, ${year}.`;
}

/**
 * Enhanced form data to document mapping
 */
function applyFormDataToFlatDocument(flatDoc, formData) {
  const updatedFlatDoc = { ...flatDoc };
  const documentTitle = Object.keys(window.currentDocument)[0] || "Terms and Conditions";

  // Website domain and owner in introduction
  if (formData.websiteDomain || formData.websiteOwnerName) {
    const introKey = `${documentTitle}.INTRODUCTION.content`;
    let introContent = "The following terms and conditions (the \"Terms\") shall govern and be the binding contract between ";
    introContent += formData.websiteDomain || "*[Insert Website Domain]*";
    introContent += " (the \"Site\") and its users. The Website owner, ";
    introContent += formData.websiteOwnerName || "*[Insert Name Website Owner]*";
    introContent += ", owns and operates the Site.";
    updatedFlatDoc[introKey] = introContent;
  }

  // Intellectual property
  if (formData.websiteOwnerName) {
    const ipKey = `${documentTitle}.INTELLECTUAL PROPERTY.content`;
    let ipContent = "All content on the Site, including but not limited to text, images, and documents, is the property of ";
    ipContent += formData.websiteOwnerName;
    ipContent += " and its creators and is protected by copyright and other intellectual property laws.";
    updatedFlatDoc[ipKey] = ipContent;
  }

  // Age restrictions
  if (formData.minimumAge) {
    const ageKey = `${documentTitle}.AGE RESTRICTIONS.content`;
    let ageContent = `Users must be at least ${formData.minimumAge} years old to use the Site. By using the Site, you represent and warrant that you are at least ${formData.minimumAge} years old. We assume no liability for any user misrepresentation of age.`;
    updatedFlatDoc[ageKey] = ageContent;
  }

  // Prohibited uses
  if (formData.prohibitedUses) {
    const prohibitedKey = `${documentTitle}.POLICY ON ACCEPTABLE USE OF THE WEBSITE.prohibited_uses`;
    updatedFlatDoc[prohibitedKey] = formData.prohibitedUses;
  }

  // User contribution policy
  if (formData.userContributionPolicy) {
    const contributionKey = `${documentTitle}.USER CONTRIBUTIONS.policy`;
    updatedFlatDoc[contributionKey] = formData.userContributionPolicy;
  }

  // Account management
  if (formData.accountResponsibility) {
    const accountRespKey = `${documentTitle}.ACCOUNTS AND ACCOUNT RESPONSIBILITIES.account_responsibility.content`;
    updatedFlatDoc[accountRespKey] = formData.accountResponsibility;
  }

  if (formData.suspensionRights) {
    const suspensionKey = `${documentTitle}.ACCOUNTS AND ACCOUNT RESPONSIBILITIES.suspension_rights.content`;
    updatedFlatDoc[suspensionKey] = formData.suspensionRights;
  }

  // Goods and services
  if (formData.businessType) {
    const saleKey = `${documentTitle}.SALE OF GOODS [AND/OR]/SERVICES.content`;
    let saleContent = "The sale of the ";
    if (formData.businessType === "Goods only") {
      saleContent += "goods is governed by these terms and conditions.";
    } else if (formData.businessType === "Services only") {
      saleContent += "services is governed by these terms and conditions.";
    } else {
      saleContent += "goods and services is governed by these terms and conditions.";
    }
    updatedFlatDoc[saleKey] = saleContent;
  }

  if (formData.goodsServices) {
    const availableKey = `${documentTitle}.SALE OF GOODS [AND/OR]/SERVICES.available_items.list`;
    updatedFlatDoc[availableKey] = formData.goodsServices;
  }

  // Payment terms
  if (formData.paymentTerms) {
    const paymentTermsKey = `${documentTitle}.SALE OF GOODS [AND/OR]/SERVICES.payment_terms.content`;
    updatedFlatDoc[paymentTermsKey] = formData.paymentTerms;
  }

  // Payment methods
  if (formData.paymentMethods) {
    const paymentKey = `${documentTitle}.PAYMENTS.methods`;
    updatedFlatDoc[paymentKey] = formData.paymentMethods;
  }

  // Shipping methods
  if (formData.shippingMethods) {
    const shippingKey = `${documentTitle}.SHIPPING AND DELIVERY.methods`;
    updatedFlatDoc[shippingKey] = formData.shippingMethods;
  }

  // Returns/store locations
  if (formData.storeLocations) {
    const returnsKey = `${documentTitle}.RETURNS.content`;
    let returnsContent = "Returns can be made in person at any of our retail stores located at ";
    returnsContent += formData.storeLocations;
    returnsContent += ". To initiate a return, please bring the original order confirmation or proof of purchase. Our store associates will assist you with the return process.";
    updatedFlatDoc[returnsKey] = returnsContent;
  }

  // Refund policy
  if (formData.refundPolicy) {
    const refundKey = `${documentTitle}.REFUNDS.policy`;
    updatedFlatDoc[refundKey] = formData.refundPolicy;
  }

  // Cancellation exceptions
  if (formData.cancellationExceptions) {
    const cancellationExceptionsKey = `${documentTitle}.CANCELLATION POLICY.additional_exceptions.list`;
    updatedFlatDoc[cancellationExceptionsKey] = formData.cancellationExceptions;
  }

  if (formData.cancellationExceptionsPolicy) {
    const cancellationExceptionsPolicyKey = `${documentTitle}.CANCELLATION POLICY.exceptions.content`;
    updatedFlatDoc[cancellationExceptionsPolicyKey] = formData.cancellationExceptionsPolicy;
  }

  if (formData.reimbursementPolicy) {
    const reimbursementKey = `${documentTitle}.CANCELLATION POLICY.reimbursement.content`;
    updatedFlatDoc[reimbursementKey] = formData.reimbursementPolicy;
  }

  // Subscription cancellation
  if (formData.subscriptionCancelDays) {
    const subscriptionKey = `${documentTitle}.SUBSCRIPTIONS.content`;
    let subscriptionContent = `Your subscription automatically renews at the end of each billing cycle unless you cancel at least ${formData.subscriptionCancelDays} days before the renewal date.`;
    updatedFlatDoc[subscriptionKey] = subscriptionContent;
  }

  // Refund processing days and contact info
  if (formData.refundBusinessDays || formData.contactDetails) {
    const orderRightsKey = `${documentTitle}.SALE OF GOODS [AND/OR]/SERVICES.order_rights.content`;
    let orderContent = "We reserve the right to modify, reject, or cancel your order for any reason, including but not limited to product availability, pricing errors, or order errors. If we cancel your order after your payment has been processed, you will receive a full refund to your original payment method within ";
    orderContent += formData.refundBusinessDays || "*[number]*";
    orderContent += " business days. You are responsible for monitoring your payment instrument to verify receipt of the refund. If you have any issues with the refund process, please contact us at: ";
    orderContent += formData.contactDetails || "*[Contact Information]*";
    updatedFlatDoc[orderRightsKey] = orderContent;
  }

  // Contact details
  if (formData.contactDetails) {
    const contactKey = `${documentTitle}.CONTACT DETAILS.details`;
    updatedFlatDoc[contactKey] = formData.contactDetails;
  }

  // Additional terms
  if (formData.additionalTerms) {
    const additionalKey = `${documentTitle}.ADDITIONAL TERMS.content`;
    updatedFlatDoc[additionalKey] = formData.additionalTerms;
  }

  // Effective date
  if (formData.effectiveDate) {
    const effectiveKey = `${documentTitle}.EFFECTIVE DATE.content`;
    updatedFlatDoc[effectiveKey] = `Effective Date: ${formatDate(formData.effectiveDate)}`;
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
      <title>Terms and Conditions</title>
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
          margin-bottom: 30pt;
          text-transform: uppercase;
        }
        .section-header {
          font-size: 14pt;
          font-weight: bold;
          margin-top: 25pt;
          margin-bottom: 15pt;
          text-transform: uppercase;
        }
        .sub-section-header {
          font-weight: bold;
          margin-top: 15pt;
          margin-bottom: 8pt;
        }
        .document-content {
          margin-bottom: 15pt;
          line-height: 1.6;
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
  link.download = "Terms_and_Conditions.docx";
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
window.handleConditionalFieldChange = handleConditionalFieldChange;
window.highlightDocumentSection = highlightDocumentSection;
window.clearHighlights = clearHighlights;
window.closeEditDialog = closeEditDialog;
window.toggleEditMode = toggleEditMode;
window.downloadWordDocx = downloadWordDocx;