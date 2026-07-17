const toastStack = document.getElementById("toast-stack");

export function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = text;
  toastStack.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast--out");
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}
