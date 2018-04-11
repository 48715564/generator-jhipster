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

const crypto = require('crypto');
const chalk = require('chalk');

const constants = require('../generator-constants');

module.exports = {
    askForModuleName,
    askForServerSideOpts,
    askForOptionalItems,
    askFori18n
};

function askForModuleName() {
    if (this.baseName) return;

    this.askModuleName(this);
}

function askForServerSideOpts(meta) {
    if (!meta && this.existingProject) return;

    const applicationType = this.applicationType;
    let defaultPort = applicationType === 'gateway' ? '8080' : '8081';
    if (applicationType === 'uaa') {
        defaultPort = '9999';
    }
    const prompts = [
        {
            when: response => (applicationType === 'gateway' || applicationType === 'microservice' || applicationType === 'uaa'),
            type: 'input',
            name: 'serverPort',
            validate: input => (/^([0-9]*)$/.test(input) ? true : 'This is not a valid port number.'),
            message: '请输入应用的端口号，请保证它在微服务体系中是唯一的',
            default: defaultPort
        },
        {
            type: 'input',
            name: 'packageName',
            validate: input => (/^([a-z_]{1}[a-z0-9_]*(\.[a-z_]{1}[a-z0-9_]*)*)$/.test(input) ?
                true : '您提供的软件包名称不是有效的Java软件包名称'),
            message: '请输入默认Java包名称?',
            default: 'com.mycompany.myapp',
            store: true
        },
        {
            when: response => applicationType === 'gateway' || applicationType === 'microservice' || applicationType === 'uaa',
            type: 'list',
            name: 'serviceDiscoveryType',
            message: '请选用哪种类型的服务发现?',
            choices: [
                {
                    value: 'eureka',
                    name: 'DaoCloud Registry (使用Eureka，提供Spring Cloud Config支持和监控仪表板)'
                },
                {
                    value: 'consul',
                    name: 'Consul'
                },
                {
                    value: false,
                    name: 'No service discovery'
                }
            ],
            default: 'eureka'
        },
        {
            when: response => applicationType === 'monolith',
            type: 'list',
            name: 'serviceDiscoveryType',
            message: '您是否想使用DaoCloud Registry来配置，监控和扩展您的应用程序?',
            choices: [
                {
                    value: false,
                    name: 'No'
                },
                {
                    value: 'eureka',
                    name: 'Yes'
                }
            ],
            default: false
        },
        {
            when: response => (
                (applicationType === 'monolith' && response.serviceDiscoveryType !== 'eureka') ||
                ['gateway', 'microservice'].includes(applicationType)
            ),
            type: 'list',
            name: 'authenticationType',
            message: `请选使用哪种 ${chalk.yellow('*类型*')}的权限验证?`,
            choices: (response) => {
                const opts = [
                    {
                        value: 'jwt',
                        name: 'JWT authentication (stateless, with a token)'
                    },
                    {
                        value: 'oauth2',
                        name: 'OAuth 2.0 / OIDC Authentication (stateful, works with Keycloak and Okta)'
                    }
                ];
                if (applicationType === 'monolith' && response.serviceDiscoveryType !== 'eureka') {
                    opts.push({
                        value: 'session',
                        name: 'HTTP Session Authentication (stateful, default Spring Security mechanism)'
                    });
                } else if (['gateway', 'microservice'].includes(applicationType)) {
                    opts.push({
                        value: 'uaa',
                        name: 'Authentication with DaoCloud UAA server (the server must be generated separately)'
                    });
                }
                return opts;
            },
            default: 0
        },
        {
            when: response => ((applicationType === 'gateway' || applicationType === 'microservice') && response.authenticationType === 'uaa'),
            type: 'input',
            name: 'uaaBaseName',
            message: '请输入UAA Server所在的目录?',
            default: '../uaa',
            validate: (input) => {
                const uaaAppData = this.getUaaAppName(input);

                if (uaaAppData && uaaAppData.baseName && uaaAppData.applicationType === 'uaa') {
                    return true;
                }
                return `无法从路径"${input}"中找到UAA`;
            }
        },
        {
            type: 'list',
            name: 'databaseType',
            message: `使用哪种${chalk.yellow('*类型*')}的数据库?`,
            choices: (response) => {
                const opts = [
                    {
                        value: 'sql',
                        name: 'SQL (H2, MySQL, MariaDB, PostgreSQL, Oracle, MSSQL)'
                    },
                    {
                        value: 'mongodb',
                        name: 'MongoDB'
                    },
                    {
                        value: 'couchbase',
                        name: '[BETA] Couchbase'
                    }
                ];
                if (
                    applicationType === 'microservice' || (response.authenticationType === 'jwt' && applicationType === 'gateway')
                ) {
                    opts.push({
                        value: 'no',
                        name: 'No database'
                    });
                }
                if (response.authenticationType !== 'oauth2') {
                    opts.push({
                        value: 'cassandra',
                        name: 'Cassandra'
                    });
                }
                return opts;
            },
            default: 0
        },
        {
            when: response => response.databaseType === 'sql',
            type: 'list',
            name: 'prodDatabaseType',
            message: `${chalk.yellow('*生产*')}环境使用哪种类型的数据库?`,
            choices: constants.SQL_DB_OPTIONS,
            default: 0
        },
        {
            when: response => response.databaseType === 'sql',
            type: 'list',
            name: 'devDatabaseType',
            message: `${chalk.yellow('*开发*')} 环境使用哪种类型的数据库?`,
            choices: response => [
                {
                    value: 'h2Disk',
                    name: 'H2 使用硬盘持久化'
                },
                {
                    value: 'h2Memory',
                    name: 'H2 使用内存持久化'
                }
            ].concat(constants.SQL_DB_OPTIONS.find(it => it.value === response.prodDatabaseType)),
            default: 0
        },
        {
            // cache is mandatory for gateway and defined later to 'hazelcast' value
            when: response => applicationType !== 'gateway',
            type: 'list',
            name: 'cacheProvider',
            message: '你想使用Spring缓存抽象吗?',
            choices: [
                {
                    value: 'ehcache',
                    name: '通过Ehcache实现（本地缓存，用于单个节点）'
                },
                {
                    value: 'hazelcast',
                    name: '通过Hazelcast实现(分布式缓存，用于多个节点)'
                },
                {
                    value: 'infinispan',
                    name: '[BETA] 使用Infinispan实施（混合缓存，适用于多个节点)'
                },
                {
                    value: 'no',
                    name: '否（当使用SQL数据库时，这也会禁用Hibernate L2缓存）'
                }
            ],
            default: (applicationType === 'microservice' || applicationType === 'uaa') ? 1 : 0
        },
        {
            when: response => ((response.cacheProvider !== 'no' || applicationType === 'gateway') && response.databaseType === 'sql'),
            type: 'confirm',
            name: 'enableHibernateCache',
            message: '是否使用Hibernate 2nd level cache?',
            default: true
        },
        {
            type: 'list',
            name: 'buildTool',
            message: '请选择使用Maven或者Gradle用于后端构建?',
            choices: [
                {
                    value: 'maven',
                    name: 'Maven'
                },
                {
                    value: 'gradle',
                    name: 'Gradle'
                }
            ],
            default: 'maven'
        }
    ];

    if (meta) return prompts; // eslint-disable-line consistent-return

    const done = this.async();

    this.prompt(prompts).then((props) => {
        this.serviceDiscoveryType = props.serviceDiscoveryType;
        this.authenticationType = props.authenticationType;

        // JWT authentication is mandatory with Eureka, so the JHipster Registry
        // can control the applications
        if (this.serviceDiscoveryType === 'eureka' && this.authenticationType !== 'uaa' && this.authenticationType !== 'oauth2') {
            this.authenticationType = 'jwt';
        }

        if (this.authenticationType === 'session') {
            this.rememberMeKey = crypto.randomBytes(20).toString('hex');
        }

        if (this.authenticationType === 'jwt' || this.applicationType === 'microservice') {
            this.jwtSecretKey = crypto.randomBytes(20).toString('hex');
        }

        // user-management will be handled by UAA app, oauth expects users to be managed in IpP
        if ((this.applicationType === 'gateway' && this.authenticationType === 'uaa') || this.authenticationType === 'oauth2') {
            this.skipUserManagement = true;
        }

        if (this.applicationType === 'uaa') {
            this.authenticationType = 'uaa';
        }

        this.packageName = props.packageName;
        this.serverPort = props.serverPort;
        if (this.serverPort === undefined) {
            this.serverPort = '8080';
        }
        this.cacheProvider = props.cacheProvider;
        this.enableHibernateCache = props.enableHibernateCache;
        this.databaseType = props.databaseType;
        this.devDatabaseType = props.devDatabaseType;
        this.prodDatabaseType = props.prodDatabaseType;
        this.searchEngine = props.searchEngine;
        this.buildTool = props.buildTool;
        this.uaaBaseName = this.getUaaAppName(props.uaaBaseName).baseName;

        if (this.databaseType === 'no') {
            this.devDatabaseType = 'no';
            this.prodDatabaseType = 'no';
            this.enableHibernateCache = false;
        } else if (this.databaseType === 'mongodb') {
            this.devDatabaseType = 'mongodb';
            this.prodDatabaseType = 'mongodb';
            this.enableHibernateCache = false;
        } else if (this.databaseType === 'couchbase') {
            this.devDatabaseType = 'couchbase';
            this.prodDatabaseType = 'couchbase';
            this.enableHibernateCache = false;
        } else if (this.databaseType === 'cassandra') {
            this.devDatabaseType = 'cassandra';
            this.prodDatabaseType = 'cassandra';
            this.enableHibernateCache = false;
        }
        // Hazelcast is mandatory for Gateways, as it is used for rate limiting
        if (this.applicationType === 'gateway') {
            this.cacheProvider = 'hazelcast';
        }
        done();
    });
}

function askForOptionalItems(meta) {
    if (!meta && this.existingProject) return;

    const applicationType = this.applicationType;
    const choices = [];
    const defaultChoice = [];
    choices.push({
        name: '反应式API，使用Spring Webflux',
        value: 'reactive:true'
    });
    if (this.databaseType === 'sql' || this.databaseType === 'mongodb') {
        choices.push({
            name: '搜索引擎使用Elasticsearch',
            value: 'searchEngine:elasticsearch'
        });
    }
    if (applicationType === 'monolith' || applicationType === 'gateway') {
        choices.push({
            name: '使用Spring Websocket',
            value: 'websocket:spring-websocket'
        });
    }
    choices.push({
        name: '使用swagger-codegen进行API first开发',
        value: 'enableSwaggerCodegen:true'
    });
    choices.push({
        name: '使用Apache Kafka的异步消息',
        value: 'messageBroker:kafka'
    });

    const PROMPTS = {
        type: 'checkbox',
        name: 'serverSideOptions',
        message: '您想使用哪些技术?',
        choices,
        default: defaultChoice
    };

    if (meta) return PROMPTS; // eslint-disable-line consistent-return

    const done = this.async();
    if (choices.length > 0) {
        this.prompt(PROMPTS).then((prompt) => {
            this.serverSideOptions = prompt.serverSideOptions;
            this.reactive = this.getOptionFromArray(this.serverSideOptions, 'reactive');
            this.websocket = this.getOptionFromArray(this.serverSideOptions, 'websocket');
            this.searchEngine = this.getOptionFromArray(this.serverSideOptions, 'searchEngine');
            this.messageBroker = this.getOptionFromArray(this.serverSideOptions, 'messageBroker');
            this.enableSwaggerCodegen = this.getOptionFromArray(this.serverSideOptions, 'enableSwaggerCodegen');
            // Only set this option if it hasn't been set in a previous question, as it's only optional for monoliths
            if (!this.serviceDiscoveryType) {
                this.serviceDiscoveryType = this.getOptionFromArray(this.serverSideOptions, 'serviceDiscoveryType');
            }
            done();
        });
    } else {
        done();
    }
}

function askFori18n() {
    if (this.existingProject || this.configOptions.skipI18nQuestion) return;

    this.aski18n(this);
}
