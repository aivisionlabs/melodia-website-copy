/**
 * Manages Google Cloud credentials parsing and validation
 * Uses GCS_CREDENTIALS_JSON environment variable (JSON string)
 */

export interface GoogleCloudCredentials {
  client_email: string;
  private_key: string;
  project_id?: string;
}

export class CredentialsManager {
  /**
   * Parse GCS credentials from JSON string
   * @param credentialsJson JSON string containing credentials
   * @returns Parsed credentials object
   * @throws Error if parsing fails or required fields are missing
   */
  static parseGCSCredentials(credentialsJson: string): GoogleCloudCredentials {
    try {
      const credentials = JSON.parse(credentialsJson);

      if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Missing required fields: client_email and private_key');
      }

      return {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
        project_id: credentials.project_id,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format in GCS_CREDENTIALS_JSON');
      }
      throw error;
    }
  }

  /**
   * Get GCS credentials from environment variable
   * @returns Parsed credentials or null if not available
   */
  static getGCSCredentialsFromEnv(): GoogleCloudCredentials | null {
    const credentialsJson = process.env.GCS_CREDENTIALS_JSON;

    if (!credentialsJson) {
      return null;
    }

    return this.parseGCSCredentials(credentialsJson);
  }

  /**
   * Validate that required environment variables are set for GCS
   * @throws Error if required credentials are missing
   */
  static validateGCSEnvironment(): void {
    const credentialsJson = process.env.GCS_CREDENTIALS_JSON;

    if (!credentialsJson) {
      throw new Error(
        'GCS_CREDENTIALS_JSON environment variable is required for Google Cloud services. ' +
        'Set it to a JSON string containing your service account credentials.'
      );
    }

    // Validate the credentials can be parsed
    this.parseGCSCredentials(credentialsJson);
  }
}

