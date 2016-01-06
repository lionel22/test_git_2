//bien.js


var mongoose = require('mongoose')
var Bien = mongoose.model('Bien')
var Client = mongoose.model('Client')
var Admin = mongoose.model('Admin')
var Agent = mongoose.model('Agent')
var Agence = mongoose.model('Agence')
var Link = mongoose.model('Link')
var Messagerie = mongoose.model('Messagerie')
var Notif = mongoose.model('Notif')
var uuid = require('node-uuid')

var async = require('async')
var _ = require('lodash')

var numeral = require('numeral');
var moment = require('moment');
var passport = require('passport');
var validator = require('validator');
var tools = require('./../controllers/tools');
var mailer = require('../mailer/mail');
var Slack = require('node-slack')
var slack = new Slack('https://hooks.slack.com/services/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');

test3 changed cool
local modif

new modifié what i added before revert. and that is the next step

exports.agent = function (req, res, next, id) {

    Agent
        .findOne({
            _id: id
        })
        // .populate('agences')
        .exec(function (err, agent) {
            if (err) {
                return next(err);
            }

            if (err) {
                return res.json({
                    err: err
                })
            }
            if (!agent) {
                return res.status(404).json({
                    message: 'agent not found',
                    err: err
                })
            }
            if (agent) {

                req.agent = agent
                next()
            }
        })
}


exports.getAllByAgence = function (req, res, next) {


    Agent
        .find({
            'agences.agence': req.agence._id
        })
        .select('-password')
        // .populate('agences')
        .exec(function (err, agents) {
            if (err) {
                return next(err);
            } else if (!agents) {
                return res.status(404).json({
                    message: 'agents not found',
                    err: err
                })
            } else {
                res.json({
                    agents: agents
                })
            }
        })
}
exports.newByAdmin = function (req, res, next) {
    var errors = {};
    var agent = new Agent(req.body.agent);
    agent.origine_creation_compte = 'NA';
    agent.agence = req.agence._id;
    agent.agences.push({
        agence: req.agence._id,
        date_ajout: new Date(),
        actived: true,
    })

    async.waterfall([
            function (callback) {

                agent.save(function (err, agentSaved) {

                    if (err) {
                        tools.getGrowMessageErrorArray(err, function (_err, errors) {
                            return callback(errors, null)
                        })
                    } else {
                        return callback(null, agentSaved)

                    }

                })
            },
            function (agent, callback) {

                req.agence.addAgent(agent._id, function (err, agenceSaved) {
                    return callback(err, agent)
                })

            }
        ],
        function (errors, agent) {

            if (errors) {
                return res.status(400).json({
                    "err": "Il y a des erreurs sur le formulaire",
                    'growlMessages': errors
                })

            } else {
                return res.status(200).json({
                    'growlMessages': [{
                        'text': 'Agent ' + agent.prenom + ' ' + agent.nom + ' enregistré avec succès!',
                        'type': 'success'
                    }]
                })
            }

        });

}

exports.new = function (req, res, next) {
    var errors = {};
    var agent = new Agent(req.body.agent);
    var verifAgent;
    agent.origine_creation_compte = 'N';
    agent.agence = req.agence._id;
    agent.password_r_token = uuid.v1();

    agent.agences.push({
        agence: agent.agence,
        date_ajout: new Date(),
        actived: true,
        role: req.body.agent.role
    })

    async.waterfall([
            function (callback) {
                if (agent.email) {
                    Agent.findOne({
                            email: agent.email
                        })
                        .exec(function (err, oldAgent) {
                            if (oldAgent) {
                                verifAgent = oldAgent;
                                return callback(409, null)
                            }
                            return callback(null, agent)
                        })
                } else {
                    return callback(null, agent)
                }

            },
            function (agent, callback) {
                agent.save(function (err, agentSaved) {

                    if (err) {
                        tools.getErrorFromModel(err, function (_err, errors) {
                            return callback(errors, null)
                        })
                    } else {
                        return callback(null, agentSaved)

                    }

                })

            },
            function (agent, callback) {

                req.agence.addAgent(agent._id, function (err, agenceSaved) {
                    return callback(err, agent)
                })

            },
            function (agent, callback) {
                mailer.agent.welcomeAgent(agent, req.agence, function (err, json) {
                    if (err) {
                        console.log("err mail", err)
                        agent.email_error = 'Problème rencontrè lors de l\'envoi de l\'email'
                    }
                    return callback(null, agent)


                })


            },
        ],
        function (errors, agent) {

            if (errors) {
                if (errors == 409) {
                    return res.status(409).json({ // 409 conflict (object exist)
                        agent: verifAgent,
                        'growlMessages': [{
                            'text': 'Un agent avec l\' adresse email ' + verifAgent.email + ' existe déjà',
                            'type': 'error'
                        }]
                    })
                } else {
                    return res.status(400).json({
                        "err": "Il y a des erreurs sur le formulaire",
                        errors: errors,
                        'growlMessages': [{
                            'text': 'Il y a des erreurs sur le formulaire !',
                            'type': 'warning'
                        }]
                    })
                }

            } else {
                var msg = [];
                msg.push({
                    'text': 'Agent ' + agent.prenom + ' ' + agent.nom + ' enregistré avec succès!',
                    'type': 'success'
                })
                if (agent.email_error) {
                    msg.push({
                        'text': agent.email_error,
                        'type': 'warning'
                    })
                }
                return res.status(200).json({
                    'growlMessages': msg
                })
            }

        });


}
exports.addExistingAgentToAgence = function (req, res, next) {
    var errors = {};


    async.waterfall([
            function (callback) {
                Agent.findOne({
                        $and: [
                            {
                                '_id': req.agent._id
                            },
                            {
                                'agences.agence': req.agence._id
                            },

                        ]
                    })
                    .exec(function (err, agent) {
                        if (err) {
                            return callback(err)
                        }
                        if (agent) {
                            return callback(409)

                        } else {
                            return callback()
                        }
                    })
            }
            , function (callback) {

                req.agent.agences.push({
                    agence: req.agence._id,
                    date_ajout: new Date(),
                    actived: true,
                    role: ''
                })

                req.agent.save(function (err, agentSaved) {

                    if (err) {
                        tools.getErrorFromModel(err, function (_err, errors) {
                            return callback(errors, null)
                        })
                    } else {
                        return callback(null, agentSaved)

                    }

                })
            },
            function (agent, callback) {

                req.agence.addAgent(agent._id, function (err, agenceSaved) {
                    return callback(err, agent)
                })

            },
        ],
        function (errors, agent) {

            if (errors) {
                if (errors == 409) {
                    return res.status(409).json({ // 409 conflict (object exist)
                        'growlMessages': [{
                            'text': ' Cet agent est déjà dans votre liste d\'agents.',
                            'type': 'error'
                        }]
                    })
                } else {
                    return res.status(400).json({
                        "err": "Il y a des erreurs sur le formulaire",
                        errors: errors,
                        'growlMessages': [{
                            'text': 'Il y a des erreurs sur le formulaire !',
                            'type': 'warning'
                        }]
                    })
                }


            } else {
                var msg = [];
                msg.push({
                    'text': 'Agent ' + agent.prenom + ' ' + agent.nom + ' a été ajouté à vote liste d\'agent avec succès.',
                    'type': 'success'
                })

                return res.status(200).json({
                    'growlMessages': msg
                })
            }

        });


}

exports.newAgentWithAgence = function (req, res, next) {

    var agence = req.body.agence,
        agent = req.body.agent;


    async.waterfall([

            function (callback) {
                newAgent = new Agent(agent);
                newAgent.save(function (err, agentSaved) {

                    if (err) {
                        return callback(err)
                    } else {
                        return callback(null, agentSaved)
                    }
                })
            },
            function (agent, callback) {

                var notif = {"categorie": 3}
                if (agence && (!agence.loc || !agence.loc.coordinates)) {
                    agence.loc = {};
                    agence.loc.coordinates = [0.00, 0.00]
                }

                // console.log('agence ', agence)
                if (agence && agence._id) {
                    agence.origine_creation_compte = 'U';
                    Agence.findOne({
                            _id: agence._id
                        })
                        .exec(function (err, agenceOld) {

                            if (err) {
                                return callback(err)
                            } else {
                                agenceOld.agents.push(agent._id)
                                agenceOld.saveWithoutValidation(function (err, agence) {
                                    if (err) {
                                        return callback(err)
                                    } else {
                                        notif.message = '"Agence" mise à jour depuis l\'ancien back.'
                                        notif.type = 6
                                        return callback(null, agent, agence, notif)
                                    }
                                })

                            }
                        })
                } else {
                    agence.origine_creation_compte = 'N';
                    var newAgence = new Agence(agence);
                    newAgence.agents.push(agent._id)

                    newAgence.saveWithoutValidation(function (err, agence) {
                        if (err) {
                            return callback(err)
                        } else {
                            notif.message = '"Agence" créé.';
                            notif.type = 2;
                            return callback(null, agent, agence, notif)
                        }
                    })


                }
            },
            function (agent, agence, notif, callback) {

                if (notif.type == 6) {

                    slack.send({
                        text: 'Yeahh! Une agence de l\'ancien back vient de mettre à jour son profil.',
                        channel: '#genius',
                        username: 'AgencesBot',
                        icon_emoji: ':ghost:',
                        attachments: [
                            {
                                "fallback": 'Yeahh! Une agence de l\'ancien back vient de mettre à jour son profil.',
                                "text": 'Yeahh! Une agence de l\'ancien back vient de mettre à jour son profil. - <http://compareagences.com/admin/profil/agence/' + agence._id + '|Voir l\'agence>',
                                "mrkdwn_in": ["fallback", "text"],
                                "color": "#7CD197"
                            }
                        ]
                    });

                } else {

                    slack.send({
                        text: 'Yeahh! Une nouvelle agence vient de créer son profil.',
                        channel: '#genius',
                        username: 'AgencesBot',
                        icon_emoji: ':ghost:',
                        attachments: [
                            {
                                "fallback": 'Yeahh! Une nouvelle agence vient de créer son profil.',
                                "text": 'Yeahh! Une nouvelle agence vient de créer son profil. - <http://compareagences.com/admin/profil/agence/' + agence._id + '|Voir l\'agence>',
                                "mrkdwn_in": ["fallback", "text"],
                                "color": "#7CD197"
                            }
                        ]
                    });


                }


                notif.lien = agence._id
                Notif.add(notif)
                // console.log('notif =>'.green, notif)
                return callback(null, agent, agence)


            },
            function (agent, agence, callback) {

                agent.password_r_token = uuid.v1();
                agent.agence = agence._id;
                agent.agences.push({
                    agence: agence._id,
                    date_ajout: new Date(),
                    actived: true,
                    role: ''
                })
                agent.save(function (err, agent) {
                    //  console.log(' agent added =>'.green)
                    if (err) {
                        return callback(err);
                    } else {

                        mailer.agent.welcomeFirstAgent(agent, function (err, json) {
                            if (err) {
                                //errors.push(err);
                                console.log('error when sending email welcomeFirstAgent')
                            } else {
                                console.log('mail confirmAgence send ')
                            }

                        })


                        return callback(null, agent);
                    }
                })

            },
        ],
        function (err, agent) {


            if (err) {
                tools.getErrorFromModel(err, function (_err, errors) {
                    console.log("errors ", errors)
                    return res.status(400).json({
                        "err": "Il y a des erreurs sur le formulaire",
                        errors: errors,
                        'growlMessages': [{
                            'text': 'Il y a des erreurs sur le formulaire !',
                            'type': 'warning'
                        }]
                    })
                })

            } else {

                req.logIn(agent, function (err) {
                    if (err) {
                        return next(err)
                    }

                    return res.status(200).json({
                        message: 'Successfully connected !',
                        err: null,
                        agent: agent,
                        'growlMessages': [{
                            'text': 'Compte Créé. Vous êtes connecté !',
                            'type': 'success'
                        }]

                    })
                })
            }

        });


}

exports.update = function (req, res, next) {
    var agent = req.body.agent

    req.agent.update(agent, req, function (err, agent) {
        if (err) {
            tools.getErrorFromModel(err, function (_err, errors) {
                if (errors) {
                    console.log("errors ", errors)
                    return res.status(400).json({
                        "err": "Il des erreurs sur le formulaire",
                        errors: errors,
                        'growlMessages': [{
                            'text': 'Il y a des champs obligatoire non remplis ou des informations incorrectes!',
                            'type': 'warning'
                        }]
                    })
                } else {
                    return next(err);
                }
            })

        } else {
            return res.status(200).json({
                agent: agent,
                'growlMessages': req.results
            })

        }
    })


}


exports.passchange = function (req, res, next) {
    var agent = req.body.agent

    var errors = {};

    if (!req.agent.password) {

        errors['password'] = {
            error: true,
            message: 'Votre mot de passe n\'a jamais été configuré, veuillez vérifiez vos mails et suivez le lien de configuration qui vous a été envoyé.'
        };

    } else if (!agent.password || !req.agent.validPassword(agent.password)) {
        errors['password'] = {
            error: true,
            message: 'Mot de passe actuel incorrect'
        };
        return res.status(400).json({
            errors: errors
        })

    } else {
        if (!agent.new_password || !agent.new_password_a || agent.new_password != agent.new_password_a) {
            errors['new_password_a'] = {
                error: true,
                message: 'Les mots de passe ne correspondent pas,!'
            };
            return res.status(400).json({
                errors: errors
            })

        } else {

            req.agent.password = agent.new_password;
            req.agent.save(function (err, agent) {
                if (err) {
                    tools.getErrorFromModel(err, function (_err, errors) {
                        if (errors) {
                            return res.status(400).json({
                                "err": "Il y a des erreurs sur le formulaire",
                                errors: errors,
                                'growlMessages': [{
                                    'text': 'Il y a des champs obligatoire non remplis ou des informations incorrectes!',
                                    'type': 'warning'
                                }]
                            })
                        } else {
                            return next(err);
                        }
                    })

                } else {
                    return res.status(200).json({
                        'growlMessages': [{text: 'Mot de passe modifié avec succès', ype: 'success'}]
                    })

                }
            })

        }
    }


}


//kikou

exports.login = function (req, res, next) {

    passport.authenticate('localAgent', function (err, agent, info) {


        if (err) {
            return next(err)
        }
        if (!agent) {
            return res.status(401).json(info)
        }
        req.logIn(agent, function (err) {

            if (err) {
                return next(err)
            }
            var opts = [
                {path: 'agence', select: '-password -message_admin -commerciaux'},
                {path: 'agences.agence', select: 'denomination email infos.logo infos.localisation'},
            ];

            Agence.populate(agent, opts, function (err, agent) {

                if (err) {
                    return next(err)

                } else {
                    req.session.passport.user.agence = agent.agence._id

                    delete agent.password
                    delete agent.agence.password
                    delete agent.agence.message_admin
                    delete agent.agence.commerciaux

                    return res.status(200).json({
                        message: 'Successfully connected',
                        agent: agent,
                        'growl-messages': [{
                            'text': 'Vous êtes maintenant connecté !',
                            'type': 'success'
                        }]
                    })
                }

            })


        });
    })(req, res, next);
}

exports.mailResetPassword = function (req, res, next) {

    var email = req.body.email
    if (!email) {
        res.status(404).json({
            'error': 'Veuillez saisir une adresse mail valide.'
        })
    } else {
        Agent.findOne({
                'email': email
            })
            .exec(function (err, agent) {

                if (err) {
                    return next(err)
                }
                if (agent) {
                    agent.password_r_token = uuid.v1();

                    console.log('http://localhost:4000/agence/agent/resetpassword/' + agent.email + '/' + agent.password_r_token);

                    mailer.agent.resetPassword(agent, agent.password_r_token, function (err, json) {
                        if (err) {
                            return next(err);
                        }
                        //console.log('mailer.agent.resetPassword : ', json)
                    })


                    agent.save(function (err, agent) {
                        if (err) {
                            return next(err);
                        } else {
                            return res.status(200).json({
                                'message': 'Vous allez recevoir un email avec un lien de réinitialisation du mot de passe.',
                                'email': agent.email,
                                'growlMessages': [{
                                    'text': 'Vous allez recevoir un email avec un lien de réinitialisation du mot de passe.',
                                    'type': 'success'
                                }]
                            })
                        }
                    })


                } else {
                    return res.status(404).json({
                        'error': 'Ce compte n\'existe pas.'
                    })
                }

            })
    }

}


exports.askResetPassword = function (req, res, next) {
    var email = req.params.email
    var token = req.params.token

    console.log("email ", email)
    console.log("token ", token)

    if (!email || !token) {
        return res.status(400).json({
            error: 'pas d\'email'
        })
    } else {
        Agent.findOne({
                $and: [
                    {email: email},
                    {password_r_token: token}
                ]
            })
            .select('_id email')
            .exec(function (err, agent) {
                if (err) {
                    return next(err);
                } else if (!agent) {
                    console.log("agent ", agent)
                    return res.status(404).json({
                        'error': 'Lien indisponible ou agent inexistant.'
                    })
                }
                else {
                    return res.status(200).json({
                        agent: agent
                    })
                }
            })
    }

}

exports.resetPassword = function (req, res, next) {

    var agent = req.body.agent

    var error = '';

    if (!agent.new_password || !agent.new_password_a) {
        return res.status(400).json({
            error: 'Le mot de passe ne doit pas être vide!'
        })

    } else {
        if (agent.new_password != agent.new_password_a) {

            return res.status(400).json({
                error: 'Les mots de passe ne correspondent pas,!'
            })

        } else {

            req.agent.password = agent.new_password;
            req.agent.password_r_token = "";
            if (req.agent.verification) {
                req.agent.verification.email = true;

            } else {
                req.agent.verification = {email: true};

            }

            req.agent.save(function (err, agent) {
                if (err) {
                    return next(err);

                } else {
                    return res.status(200).json({
                        'growlMessages': [{text: 'Mot de passe modifié avec succès', type: 'success'}]
                    })

                }
            })

        }
    }


}
exports.checkLogin = function (req, res, next) {
    if (req.isAuthenticated()) {
        if (req.user && req.user.type == 'agent') {

            var agent = req.user.toObject();

            // console.log("req.session.passport.user.agence ", req.session.passport.user.agence)
            // console.log("agent.agence ", agent.agence)
            if (req.session.passport.user.agence) {

                agent.agence = req.session.passport.user.agence;
                //  console.log("agent.agence ", agent.agence)
            }

            var opts = [
                {path: 'agence', select: '-password -message_admin -commerciaux'},
                {path: 'agences.agence', select: 'denomination email infos.logo infos.localisation'},
            ];


            Agence.populate(agent, opts, function (err, agent) {
                if (err) {
                    next(err);
                }

                delete agent.agence.status_admin
                delete agent.agence.message_admin
                delete agent.agence.password
                //delete agent.agence.infos.legal.commissionChiffre
                //delete agent.agence.infos.legal.commissionLettre
                delete agent.password

                res.status(200).json({
                    message: 'Correctement authentifié',
                    agent: agent
                })
            })


        } else {
            req.logout()
            res.status(401).json({
                message: 'Vous n\'etes pas connecté',
                user: 0
            })
        }
    } else {
        console.log('not isAuthenticated')
        res.status(401).json({
            message: 'Vous n\'etes pas connecté',
            user: 0
        })
    }
}

exports.affectAffaire = function (req, res, next) {


    async.waterfall([
        function (callback) {
            Agent.update(
                {links: req.link._id},
                {$pull: {links: req.link._id}},
                function (err, val) {
                    if (err) {
                        return callback(err, null)

                    } else {
                        return callback(null, val)

                    }
                }
            )
        },
        function (val, callback) {
            req.agent.links.push(req.link._id);
            req.agent.save(function (err, agentsaved) {
                return callback(null, val);

            })
        }

    ], function (err, result) {

        if (err) {
            return res.status(400).json({
                message: 'une erreur est survenue lors de l\'affectation de l\'affaire à l\'agent',
                'growlMessages': [{
                    'text': 'une erreur est survenue lors de l\'affectation de l\'affaire à l\'agent',
                    'type': 'warning'
                }]
            })
        } else {
            return next();
        }


    })


}

exports.logout = function (req, res, next) {
    if (req.isAuthenticated()) {
        req.logout();
        return res.status(200).json({
            message: 'Successfully deconnected',
            'growlMessages': [{
                'text': 'Vous êtes maintenant deconnecté !',
                'type': 'success'
            }]
        })

    } else {
        res.status(401).json({
            message: 'Vous n\'etes pas connecté',
            user: 0
        })

    }

}

exports.chargerAgence = function (req, res, next) {

    req.session.passport.user.agence = req.agence._id;
    console.log("req.session.user", req.session)
    req.agent.agence = req.agence._id; // make this agence as last connected agence

    req.agent.save(function (err, agent) {

        req.user.agence = agent.agence;
        res.status(200).json({
            message: 'Chargement de ' + req.agence.denomination + ' éffectué avec succès',
            user: 0
        })
    })

}

exports.getAgentsFilter = function (req, res, next) {

    //console.log('req.body : ', req.body)
    var sort = {}
    var search = req.body.search
    console.log('search.order : ', search.order)

    if (search && search.order) {
        for (var i = 0; i < search.order.length; i++) {
            if (search.order[i] == 'date_creation_compte') {
                sort['date_creation_compte'] = -1;
            }
            if (search.order[i] == 'links') {
                sort['links'] = -1;
            }
            if (search.order[i] == 'remplissage') {
                sort['remplissage'] = -1;
            }
            /* if (search.order[i] == 'agences') {
             sort['agences.agence'] = -1;
             } */

            //console.log('test ', i)
        }
    }


    // console.log("sort ", sort)

    search.limit = search.limit || 10

    search.query = new RegExp(search.query, "i")

    var globalTerm = {
        $or: [{
            'nom': search.query
        }, {
            'prenom': search.query
        }, {
            'email': search.query
        }, {
            'phone': search.query
        }, {
            'id_mysql': search.query
        }]
    }

    var query = Agent.find()

    query = query.and(globalTerm)

    query
        .populate('agences.agence')
        .sort(sort)
        .limit(search.limit)
        .skip(search.skip)
        .exec(function (err, agents) {
            if (err) {
                return next(err);
            } else {
                return res.status(200).json({
                    agents: agents
                })
            }

        })
}

exports.getAgentForAdmin = function (req, res, next) {

    // console.log('_id : ', req.agence._id)
    Agent
        .findOne({
            '_id': req.agent._id
        })
        .populate('links')
        .populate('agences.agence')
        .exec(function (err, agent) {
            if (err) {
                return next(err);
            }
            else {
                var opts = [{
                    path: 'links.bien',
                    model: 'Bien'
                }]
                Bien.populate(agent, opts, function (err, agent) {
                    if (err) {
                        return next(err);
                    }

                    var opts = [{
                        path: 'links.bien.client',
                        model: 'Client'
                    },
                        {
                            path: 'links.client',
                            model: 'Client'
                        }]
                    Client.populate(agent, opts, function (err, agent) {
                        if (err) {
                            return next(err)
                        }
                        var opts = [{
                            path: 'links.en_charge.admin',
                            model: 'Admin'
                        }]
                        Admin.populate(agent, opts, function (err, agent) {
                            if (err) {
                                return next(err)
                            }
                            var opts = [{
                                path: 'links.agence',
                                model: 'Agence'
                            }]
                            Agence.populate(agent, opts, function (err, agent) {
                                if (err) {
                                    return next(err)
                                } else {
                                    res.status(200).json({
                                        agent: agent
                                    })
                                }


                            })


                        })

                    })


                })
            }

        })
}

exports.deplaceAgenceToListAgences = function (callback) {

    // agences :  { $exists: true, $ne: []}
    Agent.find({
            agence: {$exists: true, $ne: null},
            agences: {$exists: false}

        })
        .exec(function (err, agents) {

            if (err) {
                callback('Error encoured :', err)
            } else {
                async.eachSeries(agents, function (agent, callback) {


                        agent.agences.push({
                            agence: agent.agence,
                            date_ajout: agent.date_creation_compte,
                            actived: agent.actived,
                            role: agent.role
                        })

                        agent.save(function (err, agentUpdated) {
                            if (err) {
                                console.log('Error when update agent  ', agent._id);
                                console.log('Error details ', err);

                            } else {
                                console.log('update   ', agentUpdated._id, '  has been processed successfully');
                            }
                            callback();
                        })

                        /*     callback(); */
                    },
                    function (err) {
                        console.log('End process');

                        callback('Process transfert agent.agence to agent.agences ended')

                    })
            }
        })
}
