/** Show native-script name suggestions while capturing the recipient name (create + create-song). */
export function isRecipientNameTransliterationEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_SHOW_RECIPIENT_NAME_TRANSLITERATION === "true"
  );
}
