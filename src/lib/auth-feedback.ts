export function authErrorMessage(error: { code?: string; message?: string }) {
  switch (error.code) {
    case "invalid_credentials":
    case "invalid_login_credentials": return "The email or password is incorrect. Please try again, or choose Forgot password.";
    case "email_not_confirmed": return "Please confirm your email before signing in. You can resend the confirmation below.";
    case "weak_password": return "Choose a stronger password with at least 8 characters.";
    case "same_password": return "Choose a new password different from your current password.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit": return "Too many requests. Please wait a few minutes before trying again.";
    case "otp_expired":
    case "flow_state_expired":
    case "flow_state_not_found": return "This link has expired or has already been used. Request a new email and open it in the same browser.";
    default:
      if (/fetch|network|cancel|timeout/i.test(error.message || "")) return "We couldn’t connect to Shopora. Check your internet connection and try again.";
      if (/email address not authorized|sending.*email/i.test(error.message || "")) return "We couldn’t send the email. Please try again later or contact support@makatechlimited.com.";
      return error.message || "Something went wrong. Please try again.";
  }
}

export function passwordError(password: string, confirmation: string) {
  if (password.length < 8) return "Use at least 8 characters for your password.";
  if (password !== confirmation) return "Your passwords do not match. Please enter the same password in both fields.";
  return "";
}
