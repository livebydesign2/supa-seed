import chalk from 'chalk';

export class Logger {
  private static verbose = false;
  
  static setVerbose(verbose: boolean) {
    Logger.verbose = verbose;
  }
  
  static info(message: string, data?: any) {
    console.log(chalk.blue('[INFO]'), message);
    if (data && Logger.verbose) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }
  
  static success(message: string, data?: any) {
    console.log(chalk.green('[SUCCESS]'), message);
    if (data && Logger.verbose) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }
  
  static warn(message: string, data?: any) {
    console.warn(chalk.yellow('[WARN]'), message);
    if (data && Logger.verbose) {
      console.warn(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }
  
  static error(message: string, error?: any) {
    console.error(chalk.red('[ERROR]'), message);
    
    if (error) {
      if (Logger.verbose) {
        console.error(chalk.gray('Error details:'));
        if (error.stack) {
          console.error(chalk.gray(error.stack));
        } else {
          console.error(chalk.gray(JSON.stringify(error, null, 2)));
        }
      } else {
        // Show just the error message in non-verbose mode
        console.error(chalk.gray(error.message || error));
      }
    }
  }
  
  static debug(message: string, data?: any) {
    if (process.env.DEBUG === 'true' || Logger.verbose) {
      console.log(chalk.magenta('[DEBUG]'), message);
      if (data) {
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
    }
  }
  
  static step(message: string) {
    console.log(chalk.cyan('🔄'), message);
  }
  
  static complete(message: string) {
    console.log(chalk.green('✅'), message);
  }
  
  static fail(message: string) {
    console.log(chalk.red('❌'), message);
  }
  
  static skip(message: string) {
    console.log(chalk.yellow('⚠️ '), message);
  }
}