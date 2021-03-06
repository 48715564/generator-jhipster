/**
 * Copyright 2013-2018 the original author or authors from the JHipster project.
 *
 * This file is part of the JHipster project, see https://www.jhipster.tech/
 * for more information.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const chalk = require('chalk');

module.exports = {
    askForInsightOptIn,
    askForApplicationType,
    askForModuleName,
    askFori18n,
    askForTestOpts,
    askForMoreModules
};

function askForInsightOptIn() {
    if (this.existingProject) return;

    const done = this.async();
    const insight = this.insight();

    this.prompt({
        when: () => insight.optOut === undefined,
        type: 'confirm',
        name: 'insight',
        message: `May ${chalk.cyan('JHipster')} anonymously report usage statistics to improve the tool over time?`,
        default: true
    }).then((prompt) => {
        if (prompt.insight !== undefined) {
            insight.optOut = !prompt.insight;
        }
        done();
    });
}

function askForApplicationType(meta) {
    if (!meta && this.existingProject) return;

    const DEFAULT_APPTYPE = 'monolith';
    const PROMPT = {
        type: 'list',
        name: 'applicationType',
        message: `请选择你想创建的应用${chalk.yellow('*类型*')}?`,
        choices: [
            {
                value: DEFAULT_APPTYPE,
                name: '单体应用(简单例子)'
            },
            {
                value: 'microservice',
                name: '微服务应用'
            },
            {
                value: 'gateway',
                name: '微服务网关'
            },
            {
                value: 'uaa',
                name: 'UAA服务(微服务OAuth2验证)'
            }
        ],
        default: DEFAULT_APPTYPE
    };

    if (meta) return PROMPT; // eslint-disable-line consistent-return

    const done = this.async();

    const promise = this.skipServer
        ? Promise.resolve({ applicationType: DEFAULT_APPTYPE })
        : this.prompt(PROMPT);
    promise.then((prompt) => {
        this.applicationType = this.configOptions.applicationType = prompt.applicationType;
        done();
    });
}

function askForModuleName() {
    if (this.existingProject) return;

    this.askModuleName(this);
}

function askFori18n() {
    if (this.skipI18n || this.existingProject) return;
    this.aski18n(this);
}

function askForTestOpts(meta) {
    if (!meta && this.existingProject) return;

    const choices = [];
    const defaultChoice = [];
    if (meta || !this.skipServer) {
        // all server side test frameworks should be added here
        choices.push(
            { name: 'Gatling', value: 'gatling' },
            { name: 'Cucumber', value: 'cucumber' }
        );
    }
    if (meta || !this.skipClient) {
        // all client side test frameworks should be added here
        if (this.configOptions.clientFramework === 'angularX') {
            choices.push({ name: 'Protractor', value: 'protractor' });
        }
    }
    const PROMPT = {
        type: 'checkbox',
        name: 'testFrameworks',
        message: '除了JUnit和Karma，你想使用哪种测试框架？',
        choices,
        default: defaultChoice
    };

    if (meta) return PROMPT; // eslint-disable-line consistent-return

    const done = this.async();

    this.prompt(PROMPT).then((prompt) => {
        this.testFrameworks = prompt.testFrameworks;
        done();
    });
}

function askForMoreModules() {
    if (this.existingProject) {
        return;
    }

    const done = this.async();
    this.prompt({
        type: 'confirm',
        name: 'installModules',
        message: '你想从JHipster Marketplace安装其他生成器吗？',
        default: false
    }).then((prompt) => {
        if (prompt.installModules) {
            askModulesToBeInstalled(done, this);
        } else {
            done();
        }
    });
}

function askModulesToBeInstalled(done, generator) {
    generator.httpsGet('https://api.npms.io/v2/search?q=keywords:jhipster-module+jhipster-5&from=0&size=50', (body) => {
        try {
            const moduleResponse = JSON.parse(body);
            const choices = [];
            moduleResponse.results.forEach((modDef) => {
                choices.push({
                    value: { name: modDef.package.name, version: modDef.package.version },
                    name: `(${modDef.package.name}-${modDef.package.version}) ${modDef.package.description}`
                });
            });
            if (choices.length > 0) {
                generator.prompt({
                    type: 'checkbox',
                    name: 'otherModules',
                    message: '您想使用哪些其他模块?',
                    choices,
                    default: []
                }).then((prompt) => {
                    // [ {name: [moduleName], version:[version]}, ...]
                    generator.otherModules = [];
                    prompt.otherModules.forEach((module) => {
                        generator.otherModules.push({ name: module.name, version: module.version });
                    });
                    generator.configOptions.otherModules = generator.otherModules;
                    done();
                });
            } else {
                done();
            }
        } catch (err) {
            generator.warning(`Error while parsing. Please install the modules manually or try again later. ${err.message}`);
            generator.debug('Error:', err);
            done();
        }
    }, (error) => {
        generator.warning(`Unable to contact server to fetch additional modules: ${error.message}`);
        generator.debug('Error:', error);
        done();
    });
}
