import { validateGitHubCredentials } from './validation';

/**
 * GitHub Service for Trading Journal
 * Handles committing trade records and screenshots to GitHub repository
 * with comprehensive error handling and validation
 */

interface GitHubCommitOptions {
  owner: string;
  repo: string;
  token: string;
  branch?: string;
}

interface GitHubResponse {
  success: boolean;
  sha?: string;
  error?: string;
  message?: string;
}

/**
 * Get the base64 encoded content of a file with size validation
 */
async function getBase64(data: string | Blob): Promise<string> {
  const MAX_SIZE = 25 * 1024 * 1024; // 25MB limit for GitHub API

  if (typeof data === 'string') {
    const byteSize = new Blob([data]).size;
    if (byteSize > MAX_SIZE) {
      throw new Error('Content exceeds maximum size limit (25MB)');
    }
    return Buffer.from(data).toString('base64');
  }

  if (data.size > MAX_SIZE) {
    throw new Error('File exceeds maximum size limit (25MB)');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        if (!base64) {
          reject(new Error('Failed to encode file'));
        }
        resolve(base64);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(data);
  });
}

/**
 * Commit a file to GitHub repository with comprehensive error handling
 */
export async function commitToGithub(
  filePath: string,
  content: string | Blob,
  message: string,
  options: GitHubCommitOptions
): Promise<GitHubResponse> {
  try {
    const { owner, repo, token, branch = 'main' } = options;

    // Validate credentials
    const validation = validateGitHubCredentials(owner, repo, token);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Validate file path to prevent directory traversal
    if (filePath.includes('..') || filePath.startsWith('/')) {
      return { success: false, error: 'Invalid file path' };
    }

    // Get the file content in base64
    const base64Content = await getBase64(content);

    // First, try to get the current file SHA (for updates)
    let currentSha: string | undefined;
    try {
      const getResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'TradingJournal',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );

      if (getResponse.ok) {
        const data = (await getResponse.json()) as { sha: string };
        currentSha = data.sha;
      }
    } catch (error) {
      // File doesn't exist yet, that's fine
      console.error('[v0] Failed to check existing file:', error);
    }

    // Create or update the file
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'TradingJournal',
        },
        body: JSON.stringify({
          message: sanitizeCommitMessage(message),
          content: base64Content,
          branch,
          ...(currentSha && { sha: currentSha }),
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      }
    );

    if (response.ok) {
      const data = (await response.json()) as { commit: { sha: string } };
      return { success: true, sha: data.commit.sha };
    }

    if (response.status === 401) {
      return { success: false, error: 'Invalid GitHub token' };
    }

    if (response.status === 404) {
      return { success: false, error: 'Repository not found' };
    }

    const errorData = (await response.json()) as { message?: string };
    return { success: false, error: errorData.message || 'GitHub API error' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Sanitize commit message to prevent injection attacks
 */
function sanitizeCommitMessage(message: string): string {
  return message
    .replace(/[<>\"']/g, '')
    .slice(0, 200)
    .trim();
}

/**
 * Upload multiple files to GitHub (trades + screenshots)
 */
export async function uploadTradesToGithub(
  trades: Array<{
    id: string;
    date: string;
    markdown: string;
    screenshots: Array<{ file: Blob; filename: string }>;
  }>,
  options: GitHubCommitOptions
): Promise<{ success: boolean; count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  for (const trade of trades) {
    // Upload markdown file
    const markdownPath = `trades/${trade.date.split('-')[0]}/${trade.date}/${trade.id}.md`;
    const markdownResult = await commitToGithub(
      markdownPath,
      trade.markdown,
      `Add trade record: ${trade.id} on ${trade.date}`,
      options
    );

    if (markdownResult.success) {
      count++;
    } else {
      errors.push(
        `Failed to upload trade markdown: ${trade.id} - ${markdownResult.error}`
      );
    }

    // Upload screenshots
    for (const screenshot of trade.screenshots) {
      const screenshotPath = `trades/${trade.date.split('-')[0]}/${trade.date}/screenshots/${screenshot.filename}`;
      const screenshotResult = await commitToGithub(
        screenshotPath,
        screenshot.file,
        `Add screenshot for trade: ${trade.id}`,
        options
      );

      if (!screenshotResult.success) {
        errors.push(
          `Failed to upload screenshot: ${screenshot.filename} - ${screenshotResult.error}`
        );
      }
    }
  }

  return { success: errors.length === 0, count, errors };
}

/**
 * Generate a GitHub URL for a file in the repository
 */
export function getGithubFileUrl(
  owner: string,
  repo: string,
  filePath: string,
  branch: string = 'main'
): string {
  return `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`;
}

/**
 * Generate a GitHub raw content URL for a file
 */
export function getGithubRawUrl(
  owner: string,
  repo: string,
  filePath: string,
  branch: string = 'main'
): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
}

/**
 * Parse GitHub repository URL to extract owner and repo
 * Supports formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - github.com/owner/repo
 * - owner/repo
 */
export function parseGithubRepoUrl(url: string): { owner: string; repo: string } | null {
  try {
    // Remove .git suffix if present
    const cleanUrl = url.replace(/.git$/, '').trim();
    
    // Parse full GitHub URL
    if (cleanUrl.includes('github.com')) {
      const match = cleanUrl.match(/github\.com[:/]([^/]+)\/([^/]+)/);
      if (match) {
        return { owner: match[1], repo: match[2] };
      }
    }
    
    // Parse simple owner/repo format
    if (cleanUrl.includes('/')) {
      const parts = cleanUrl.split('/');
      const repo = parts[parts.length - 1];
      const owner = parts[parts.length - 2];
      if (owner && repo && !owner.includes('http') && !owner.includes('.')) {
        return { owner, repo };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch trades from a GitHub repository's JSON file
 * Downloads the trading-journal-complete-*.json or all_trades.json file
 */
export async function fetchTradesFromGithub(
  owner: string,
  repo: string,
  branch: string = 'main',
  filePath: string = 'trades/all_trades.json'
): Promise<{ trades: any[]; ideas?: any[]; success: boolean; error?: string }> {
  try {
    const rawUrl = getGithubRawUrl(owner, repo, filePath, branch);
    
    const response = await fetch(rawUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      // Try alternative file paths
      const alternativePaths = [
        'trading-journal-complete.json',
        'trades.json',
        'all_trades.json',
      ];
      
      for (const altPath of alternativePaths) {
        const altUrl = getGithubRawUrl(owner, repo, altPath, branch);
        const altResponse = await fetch(altUrl, {
          signal: AbortSignal.timeout(10000),
        });
        
        if (altResponse.ok) {
          try {
            const data = await altResponse.json();
            
            // Check if it's the combined format with trades and ideas
            if (data.trades && Array.isArray(data.trades)) {
              return {
                trades: data.trades,
                ideas: data.ideas || [],
                success: true,
              };
            }
            
            // Check if it's just an array of trades
            if (Array.isArray(data)) {
              return {
                trades: data,
                ideas: [],
                success: true,
              };
            }
          } catch {
            continue;
          }
        }
      }
      
      return {
        trades: [],
        success: false,
        error: `Failed to fetch trades file from ${owner}/${repo}. Make sure the repository contains a trades JSON file.`,
      };
    }

    try {
      const data = await response.json();
      
      // Check if it's the combined format with trades and ideas
      if (data.trades && Array.isArray(data.trades)) {
        return {
          trades: data.trades,
          ideas: data.ideas || [],
          success: true,
        };
      }
      
      // Check if it's just an array of trades
      if (Array.isArray(data)) {
        return {
          trades: data,
          ideas: [],
          success: true,
        };
      }
      
      return {
        trades: [],
        success: false,
        error: 'Invalid trades file format',
      };
    } catch (error) {
      return {
        trades: [],
        success: false,
        error: `Failed to parse trades data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  } catch (error) {
    return {
      trades: [],
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
