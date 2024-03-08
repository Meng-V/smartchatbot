import { Global, Injectable, Logger } from '@nestjs/common';

@Injectable()
@Global()
export class NetworkService {
  private readonly logger = new Logger(NetworkService.name);

  /**
   * Retries executing the given asynchronous function until it succeeds or the maximum number of attempts is reached.
   * @param func The asynchronous function to be retried.
   * @param maxAttempts The maximum number of attempts before giving up.
   * @returns A Promise that resolves with the result of the successful function execution.
   * @throws If the function does not succeed after the maximum number of attempts.
   * @template T The type of the result returned by the input function
   **/
  async retryWithMaxAttempts<T>(
    axiosFunc: (...args: any[]) => Promise<T>,
    maxAttemps: number = 5,
  ): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      let retries = 0;
      let response;
      let error: any;
      // Retry until the function succeeds or the maximum number of attempts is reached
      while (!response && retries < maxAttemps) {
        try {
          response = await axiosFunc();
        } catch (e: any) {
          error = e;
        }
        retries++;
      }

      if (response) {
        resolve(response);
      } else {
        const errorMessage =
          'Cannot establish connection with the target network.\n' + error.message;
        this.logger.error(errorMessage);
        throw new Error(errorMessage);
      }
    });
  }
}
