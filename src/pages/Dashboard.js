"use client"

import { useState, useEffect, useRef } from "react"
import axios from "axios"
import "./Dashboard.css"

const Dashboard = ({ userEmail, userName, onSignOut }) => {
  const [expenses, setExpenses] = useState([])
  const [newExpense, setNewExpense] = useState({
    category: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [receiptUrl, setReceiptUrl] = useState("")
  const [uploadingExpenseId, setUploadingExpenseId] = useState(null)
  const [rowMessages, setRowMessages] = useState({})
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  // File input refs for each row
  const fileInputRefs = useRef({})

  // User data - now comes from props
  const userData = {
    email: userEmail || "user@example.com",
    name: userName || "User",
    avatar: "th.jpeg",
  }

  // Define the API URLs
  const API_URL = "https://dp66ensmpk.execute-api.us-east-1.amazonaws.com/dev/getExpenses"
  const ADD_EXPENSE_URL = "https://dp66ensmpk.execute-api.us-east-1.amazonaws.com/dev/addExpense"
  const UPDATE_EXPENSE_URL = "https://dp66ensmpk.execute-api.us-east-1.amazonaws.com/dev/updateExpense"
  const DELETE_EXPENSE_URL = "https://dp66ensmpk.execute-api.us-east-1.amazonaws.com/dev/deleteExpense"
  const UPLOAD_RECEIPT_URL = "https://dp66ensmpk.execute-api.us-east-1.amazonaws.com/dev/uploadReceipt"

  const userId = userEmail && userEmail.trim().length > 0 ? userEmail.trim() : "guest"

  useEffect(() => {
    if (userId && userId !== "guest") {
      console.log("[v0] Valid userId available, fetching expenses:", userId)
      fetchExpenses()
    } else {
      console.log("[v0] Waiting for valid userId. Current userEmail:", userEmail)
    }
  }, [userId])

  const fetchExpenses = async () => {
    setIsLoading(true)
    try {
      console.log("[v0] Fetching expenses for userId:", userId)
      const response = await axios.get(`${API_URL}?userId=${encodeURIComponent(userId)}`)

      console.log("[v0] Raw response:", response)
      console.log("[v0] Response data:", response.data)

      let data = response.data
      if (data.body) {
        data = JSON.parse(data.body)
      }

      if (Array.isArray(data)) {
        setExpenses(data)
      } else if (Array.isArray(data.Items)) {
        setExpenses(data.Items)
      } else {
        setExpenses([])
      }
    } catch (error) {
      console.error("Error fetching expenses:", error)
      setMessage({ text: "Failed to load expenses", type: "error" })
      setExpenses([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewExpense({
      ...newExpense,
      [name]: value,
    })
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    setSelectedFile(file)
    setMessage({ text: "", type: "" })
  }

  const uploadReceipt = async (file, expenseId = null) => {
    if (!file) {
      setMessage({ text: "Please select a file first", type: "error" })
      return null
    }

    const fileExtension = file.name.split(".").pop()
    const uniqueFilename = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`

    try {
      setUploadProgress(0)

      // Create form data for file upload
      const formData = new FormData()
      formData.append("file", file)
      formData.append("userId", userId)
      formData.append("filename", uniqueFilename)

      const response = await axios.post(UPLOAD_RECEIPT_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(percentCompleted)
        },
      })

      // Extract the receipt URL from the response
      let receiptData = response.data
      if (typeof receiptData === "string") {
        try {
          receiptData = JSON.parse(receiptData)
        } catch (e) {
          // Not JSON, use as is
        }
      }

      if (receiptData.body) {
        try {
          receiptData = JSON.parse(receiptData.body)
        } catch (e) {
          // Not JSON, use as is
        }
      }

      const receiptUrl = receiptData.receiptUrl || receiptData.url || ""

      if (expenseId) {
        // If uploading for a specific expense row
        setUploadingExpenseId(null)

        // Update expense with receipt URL
        await updateExpenseReceipt(expenseId, receiptUrl)

        // Add success message for this row
        setRowMessages((prev) => ({
          ...prev,
          [expenseId]: { text: "Receipt uploaded successfully", type: "success" },
        }))

        // Clear row message after 3 seconds
        setTimeout(() => {
          setRowMessages((prev) => {
            const newMessages = { ...prev }
            delete newMessages[expenseId]
            return newMessages
          })
        }, 3000)
      } else {
        // For form upload
        setReceiptUrl(receiptUrl)
        setMessage({ text: "Receipt uploaded successfully", type: "success" })
        setSelectedFile(null)
      }

      setUploadProgress(0)

      // Return the URL for further use
      return receiptUrl
    } catch (error) {
      console.error("Error uploading receipt:", error)

      if (expenseId) {
        // Error message for row upload
        setUploadingExpenseId(null)
        setRowMessages((prev) => ({
          ...prev,
          [expenseId]: {
            text: `Upload failed: ${error.response?.data?.message || error.message}`,
            type: "error",
          },
        }))

        // Clear row message after 3 seconds
        setTimeout(() => {
          setRowMessages((prev) => {
            const newMessages = { ...prev }
            delete newMessages[expenseId]
            return newMessages
          })
        }, 3000)
      } else {
        // Error message for form upload
        setMessage({
          text: `Failed to upload receipt: ${error.response?.data?.message || error.message}`,
          type: "error",
        })
      }

      setUploadProgress(0)
      return null
    }
  }

  const updateExpenseReceipt = async (expenseId, receiptUrl) => {
    try {
      // Find current expense data
      const expense = expenses.find((exp) => exp.expenseId === expenseId)
      if (!expense) return

      // Update expense with new receipt URL
      await axios.put(UPDATE_EXPENSE_URL, {
        ...expense,
        receiptUrl: receiptUrl,
        userId: userId,
      })

      // Update local expenses state with new receipt URL
      setExpenses(expenses.map((exp) => (exp.expenseId === expenseId ? { ...exp, receiptUrl } : exp)))
    } catch (error) {
      console.error("Error updating expense with receipt URL:", error)
    }
  }

  const handleRowFileChange = async (e, expenseId) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadingExpenseId(expenseId)
    await uploadReceipt(file, expenseId)

    // Reset file input
    if (fileInputRefs.current[expenseId]) {
      fileInputRefs.current[expenseId].value = ""
    }
  }

  const resetForm = () => {
    setNewExpense({
      category: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
    })
    setIsEditing(false)
    setEditingId(null)
    setSelectedFile(null)
    setUploadProgress(0)
    setReceiptUrl("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage({ text: "", type: "" })

    // Validate inputs
    if (!newExpense.category || !newExpense.amount) {
      setMessage({ text: "Category and amount are required", type: "error" })
      setIsLoading(false)
      return
    }

    try {
      // Upload the receipt if a file is selected
      let uploadedReceiptUrl = ""
      if (selectedFile) {
        uploadedReceiptUrl = await uploadReceipt(selectedFile)
        if (!uploadedReceiptUrl) {
          setIsLoading(false)
          return // Stop if upload failed
        }
      }

      const expenseData = {
        ...newExpense,
        userId: userId,
      }

      // Add receipt URL to expense data if available
      if (uploadedReceiptUrl) {
        expenseData.receiptUrl = uploadedReceiptUrl
      } else if (receiptUrl && isEditing) {
        // Keep the existing receipt URL when editing
        expenseData.receiptUrl = receiptUrl
      }

      if (isEditing) {
        // Update existing expense
        await axios.put(UPDATE_EXPENSE_URL, {
          ...expenseData,
          expenseId: editingId,
        })
        setMessage({ text: "Expense updated successfully", type: "success" })
      } else {
        // Add new expense
        await axios.post(ADD_EXPENSE_URL, expenseData)
        setMessage({ text: "Expense added successfully", type: "success" })
      }

      // Reset form
      resetForm()

      // Refresh the expenses list
      fetchExpenses()
    } catch (error) {
      console.error(`Error ${isEditing ? "updating" : "adding"} expense:`, error)
      setMessage({
        text: `Failed to ${isEditing ? "update" : "add"} expense: ${error.response?.data?.message || error.message}`,
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (expenseId) => {
    setIsLoading(true)

    try {
      // Find the expense in the current expenses array
      const expense = expenses.find((exp) => exp.expenseId === expenseId)

      if (!expense) {
        throw new Error("Expense not found")
      }

      // Set form to edit mode with expense data
      setNewExpense({
        category: expense.category || "",
        amount: expense.amount || "",
        date: expense.date || new Date().toISOString().split("T")[0],
      })

      // Set receipt URL if available
      setReceiptUrl(expense.receiptUrl || "")

      setIsEditing(true)
      setEditingId(expenseId)

      // Scroll to form
      window.scrollTo({ top: 0, behavior: "smooth" })

      // Show success message
      setMessage({ text: "Expense loaded for editing", type: "success" })
    } catch (error) {
      console.error("Error loading expense for editing:", error)
      setMessage({ text: "Failed to load expense details", type: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    resetForm()
    setMessage({ text: "", type: "" })
  }

  const removeExpense = async (expenseId) => {
  if (!window.confirm("Are you sure you want to delete this expense?")) {
    return
  }

  setIsLoading(true)
  setMessage({ text: "", type: "" })

  try {
    const url = `${DELETE_EXPENSE_URL}?userId=${encodeURIComponent(userId)}&expenseId=${encodeURIComponent(expenseId)}`
    console.log("Deleting:", url)
    await axios.delete(url)
    setMessage({ text: "Expense deleted successfully", type: "success" })
    fetchExpenses()
  } catch (error) {
    console.error("Error deleting expense:", error)
    setMessage({
      text: `Failed to delete expense: ${error.response?.data?.message || error.message}`,
      type: "error"
    })
  } finally {
    setIsLoading(false)
  }
}

  const viewReceipt = (url) => {
    if (url) {
      window.open(url, "_blank")
    }
  }

  const handleSignOut = () => {
    // Close dropdown first
    setShowProfileDropdown(false)

    // Call the Amplify signOut function
    if (onSignOut) {
      onSignOut()
    }
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + Number.parseFloat(expense.amount || 0), 0)

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown)
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".profile-dropdown")) {
        setShowProfileDropdown(false)
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [])

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo">💰</div>
            <h1>Expense Dashboard</h1>
          </div>

          <div className="profile-dropdown">
            <div className="profile-trigger" onClick={toggleProfileDropdown}>
              <img src={userData.avatar || "/placeholder.svg"} alt={userData.name} className="avatar" />
              <span className="dropdown-arrow">▼</span>
            </div>
            {showProfileDropdown && (
              <div className="profile-menu">
                <div className="profile-info">
                  <div className="profile-name">{userData.name}</div>
                  <div className="profile-email">{userData.email}</div>
                </div>
                <div className="profile-divider"></div>
                <button className="sign-out-btn" onClick={handleSignOut}>
                  🚪 Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="main-content">
        {/* Welcome Message */}
        <div className="welcome-message">
          <h2>Welcome back, {userData.name}! 👋</h2>
          <p>Here's your expense overview</p>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Total Expenses</span>
              <span className="stat-icon">💰</span>
            </div>
            <div className="stat-value">${totalExpenses.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Total Records</span>
              <span className="stat-icon">📄</span>
            </div>
            <div className="stat-value">{expenses.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">With Receipts</span>
              <span className="stat-icon">👁️</span>
            </div>
            <div className="stat-value">{expenses.filter((exp) => exp.receiptUrl).length}</div>
          </div>
        </div>

        {/* Add/Edit Expense Form */}
        <div className="form-card">
          <div className="card-header">
            <h2>{isEditing ? `✏️ Edit Expense (ID: ${editingId})` : "➕ Add New Expense"}</h2>
            <p className="card-description">
              {isEditing ? "Update the expense details below" : "Fill in the details to add a new expense"}
            </p>
          </div>

          <div className="card-content">
            {message.text && (
              <div className={`alert ${message.type === "error" ? "alert-error" : "alert-success"}`}>
                <span className="alert-icon">{message.type === "error" ? "⚠️" : "✅"}</span>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="expense-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="category">🏷️ Category</label>
                  <select
                    name="category"
                    value={newExpense.category}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    <option value="">Select Category</option>
                    <option value="Food">Food</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="amount">💵 Amount ($)</label>
                  <input
                    type="number"
                    name="amount"
                    value={newExpense.amount}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="date">📅 Date</label>
                  <input
                    type="date"
                    name="date"
                    value={newExpense.date}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Receipt Upload Section */}
              <div className="receipt-section">
                <label className="receipt-label">
                  📎 Receipt Upload
                  {isEditing && receiptUrl && <span className="receipt-badge">Current receipt available</span>}
                </label>

                <div className="receipt-upload">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*, application/pdf"
                    className="file-input"
                  />

                  {uploadProgress > 0 && (
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                      <p className="progress-text">{uploadProgress}% Uploaded</p>
                    </div>
                  )}

                  {receiptUrl && (
                    <div className="receipt-actions">
                      <button type="button" className="btn btn-outline" onClick={() => viewReceipt(receiptUrl)}>
                        👁️ View {isEditing ? "Current" : "Uploaded"} Receipt
                      </button>
                    </div>
                  )}

                  <p className="receipt-help">
                    {isEditing
                      ? "Leave empty to keep existing receipt or upload a new one."
                      : "Supported formats: JPG, PNG, PDF. Max size: 5MB"}
                  </p>
                </div>
              </div>

              <div className="form-actions">
                {isEditing && (
                  <button type="button" className="btn btn-outline" onClick={handleCancel}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? "Processing..." : isEditing ? "Update Expense" : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="table-card">
          <div className="card-header">
            <h2>Your Expenses</h2>
            <p className="card-description">Manage and track all your expenses</p>
          </div>

          <div className="card-content">
            {isLoading && expenses.length === 0 ? (
              <div className="loading-state">
                <p>Loading expenses...</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="expenses-table">
                  <thead>
                    <tr>
                      <th>Expense ID</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Receipt</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length > 0 ? (
                      expenses.map((expense) => (
                        <tr key={expense.expenseId} className={editingId === expense.expenseId ? "editing-row" : ""}>
                          <td className="expense-id">{expense.expenseId}</td>
                          <td>
                            <span className="category-badge">{expense.category}</span>
                          </td>
                          <td className="amount">${Number.parseFloat(expense.amount).toFixed(2)}</td>
                          <td>{expense.date}</td>
                          <td>
                            <div className="receipt-cell">
                              {uploadingExpenseId === expense.expenseId && (
                                <div className="progress-bar small">
                                  <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                                </div>
                              )}

                              {rowMessages[expense.expenseId] && (
                                <div className={`row-message ${rowMessages[expense.expenseId].type}`}>
                                  {rowMessages[expense.expenseId].text}
                                </div>
                              )}

                              <div className="receipt-actions">
                                {/* Always show View Receipt button if receipt exists */}
                                {expense.receiptUrl && (
                                  <button
                                    className="btn btn-sm btn-view"
                                    onClick={() => viewReceipt(expense.receiptUrl)}
                                  >
                                    👁️ View Receipt
                                  </button>
                                )}

                                {/* Upload/Replace button */}
                                <div className="upload-wrapper">
                                  <input
                                    type="file"
                                    id={`receipt-${expense.expenseId}`}
                                    onChange={(e) => handleRowFileChange(e, expense.expenseId)}
                                    accept="image/*, application/pdf"
                                    className="hidden-file-input"
                                    ref={(el) => (fileInputRefs.current[expense.expenseId] = el)}
                                  />
                                  <button
                                    className={`btn btn-sm ${expense.receiptUrl ? "btn-secondary" : "btn-primary"}`}
                                    onClick={() => fileInputRefs.current[expense.expenseId]?.click()}
                                    disabled={uploadingExpenseId === expense.expenseId}
                                  >
                                    📎{" "}
                                    {uploadingExpenseId === expense.expenseId
                                      ? "Uploading..."
                                      : expense.receiptUrl
                                        ? "Replace Receipt"
                                        : "Upload Receipt"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className={`btn btn-sm ${editingId === expense.expenseId ? "btn-secondary" : "btn-outline"}`}
                                onClick={() => handleEdit(expense.expenseId)}
                                disabled={isLoading}
                              >
                                ✏️ {editingId === expense.expenseId ? "Editing..." : "Edit"}
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => removeExpense(expense.expenseId)}
                                disabled={isLoading || editingId === expense.expenseId}
                              >
                                🗑️ Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="empty-state">
                          <div className="empty-content">
                            <span className="empty-icon">📄</span>
                            <p>No expenses found</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
