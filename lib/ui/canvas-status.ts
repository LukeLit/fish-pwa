/**
 * Canvas Operation Status
 * 
 * Dispatches status events that the FishEditorCanvas listens for
 * to display operation progress (uploading, generating, etc.)
 */

/**
 * Set the canvas operation status message
 * Pass null to clear the status
 */
export function setCanvasStatus(status: string | null): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('canvasOperationStatus', {
      detail: { status }
    }));
  }
}

/**
 * Clear the canvas operation status
 */
export function clearCanvasStatus(): void {
  setCanvasStatus(null);
}
