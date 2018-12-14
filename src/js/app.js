App = {
  web3Provider: null,
  yourAddress: '',
  contracts: {},
  loader: null,
  content: null,
  candidateCount: 0,
  candidateList: [],
  electionTopic: '',
  latestblock: 0,
  winningCandidateId: null,

  init: function () {
    loader = $('#loader');
    content = $('#content');

    return App.initWeb3();
  },

  initWeb3: function () {
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
    } else {
      // If no injected web3 instance is detected, fall back to Ganache
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
    }
    web3 = new Web3(App.web3Provider);
    // App.latestblock =  web3.eth.blockNumber;
    return App.initContract();
  },

  initContract: function () {
    $.getJSON('Election.json', function (data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var ElectionArtifact = data;
      App.contracts.Election = TruffleContract(ElectionArtifact);

      // Set the provider for our contract
      App.contracts.Election.setProvider(App.web3Provider);

      // Listen for events in the contract
      App.listenForEvents();

      web3.currentProvider.publicConfigStore.on('update', function (result) {
        if (result.selectedAddress != App.yourAddress) {
          location.reload();
        }

      });

      return App.showResult();
    });
    return App.bindEvents();
  },

  bindEvents: function () {
    $('#voteBtn').click(function () {
      var radioGroup = $("input[name='candidateGroup']");
      var selectedIndex = radioGroup.index(radioGroup.filter(':checked')) + 1;

      if (selectedIndex == 0) {
        $('.toast').hide();
        M.toast({ html: 'Select a Candidate first' });
      } else {
        App.contracts.Election.deployed().then(function (instance) {
          instance.vote(selectedIndex, { from: App.account }).then(function (result) {
            console.log(result);
            location.reload();
          });
        });
      }
    });

    $('#registerBtn').click(function () {
      var voterName = $('#yourName').val();
      var aadharNumber = $('#yourAadhar').val();
      if (voterName && aadharNumber.length == 12) {
        App.contracts.Election.deployed().then(function (instance) {
          return instance.addVoter(voterName, { from: App.account }).then(function (result) {
            loader.show();
            content.hide();

          })
        });
      } else {
        $('.toast').hide();
        M.toast({ html: 'Invalid credentials' });
      }

    });
  },

  showResult: function (adopters, account) {
    loader.hide();
    content.show();
    var electionInstance;

    App.contracts.Election.deployed().then(function (instance) {
      electionInstance = instance;

      electionInstance.endTime().then(function (endTime) {
        var countDownDate = new Date(endTime * 1000);
        var now = new Date().getTime();
        var distance = countDownDate - now;
        if (distance > 0) {
          showCountDown(endTime);
        }
      });

      web3.eth.getCoinbase(function (error, account) {
        if (!error) {
          App.yourAddress = account;
        }
      });
      return electionInstance.isAdmin();
    }).then(function (isAdmin) {
      if (isAdmin) {
        $('#voterContent').hide();
        $('#adminContent').show();

        electionInstance.endTime().then(function (endTime) {
          var countDownDate = new Date(endTime * 1000);
          var now = new Date().getTime();
          var distance = countDownDate - now;
          if (distance < 0) {  //// Time is up
            $('#countDown').text('Time is up');

          } else {

          }
        });

      } else {
        $('#adminContent').hide();
        $('#voterContent').show();

        electionInstance.endTime().then(function (endTime) {
          var countDownDate = new Date(endTime * 1000);
          var now = new Date().getTime();
          var distance = countDownDate - now;
          if (distance < 0) {  //// Time is up

            electionInstance.getWinningCandidate().then(function (winningCandidate) {
              App.winningCandidate = winningCandidate;
            });

            $('#resultsContent').show();
            $('#countDown').text('Time is up');
            electionInstance.getCurrentVoter().then(function (result) {
              electionInstance.topic().then(function (topic) {
                $('#electionTopic3').text(topic);
                if (!result[3]) { //// if not registered
                  $('#welcomeText3').text('You did not register for this election.');
                } else {
                  $('#welcomeText3').text('Welcome ' + result[1]);
                  $('#yourAddress3').text('Your Account\'s address is ' + result[0]);
                  if (result[2]) {
                    electionInstance.candidates(result[4]).then(function (candidate) {
                      $('#yourCandidate3').text('You have successfully voted for ' + candidate[1]);
                    });
                  } else {
                    $('#yourCandidate3').text('You did not Vote in this election.');
                  }
                }
              });

              ////// show result here

              electionInstance.candidatesCount().then(function (candidatesCount) {
                var resultCollection = $('#resultCollection');
                var resultTemplate = $('#resultTemplate');
                var temp = 1;
                electionInstance.getWinningCandidate().then(function (winningCandidate) {
                  $('#winnerMessage').text(winningCandidate[1] + " has won the election.");
                });

                for (var i = 1; i <= candidatesCount; i++) {
                  electionInstance.getVoteCountFor(i).then(function (result) {
                    resultTemplate.find('#candidateName').text(temp++ + ". " + result[1]);
                    resultTemplate.find('#candidateVotes').text(result[0] + " Votes");
                    // if(temp == App.winningCandidate[0].toNumber()) {
                    //   resultTemplate.find('#candidateName').addClass('indigo-text');
                    //   resultTemplate.find('#candidateVotes').addClass('indigo-text');
                    // } else {
                    //   console.log(temp, App.winningCandidate[0].toNumber());
                    // }
                    resultCollection.append(resultTemplate.html());
                  });
                }
              });



            });

          } else {
            electionInstance.getCurrentVoter().then(function (result) {
              if (result[2]) {  /////// if already voted
                electionInstance.topic().then(function (topic) {
                  $('#votedContent').show();
                  $('#electionTopic2').text(topic);
                  $('#welcomeText2').text('Welcome ' + result[1]);
                  $('#yourAddress2').text('Your Account\'s address is ' + result[0]);
                  electionInstance.candidates(result[4]).then(function (candidate) {
                    $('#yourCandidate').text('You have successfully voted for ' + candidate[1]);
                  });
                });

              } else {
                if (result[3]) {    //////// if already registered
                  $('#registerContent').hide();
                  electionInstance.topic().then(function (topic) {

                    $('#voteContent').show();
                    $('#topic').text(topic);
                    $('#yourAddress').text('Your Account\'s address is ' + result[0]);
                    $('#welcomeText').text('Welcome ' + result[1]);

                    electionInstance.candidatesCount().then(function (candidatesCount) {
                      var candidatesRow = $('#candidatesRow');
                      var candidateTemplate = $('#candidateTemplate');
                      for (var i = 1; i <= candidatesCount; i++) {
                        electionInstance.candidates(i).then(function (candidate) {
                          candidateTemplate.find('#candidateName').text(candidate[1]);
                          candidatesRow.append(candidateTemplate.html());
                        })
                      }
                    });

                  });
                } else {
                  $('#voteContent').hide();
                  electionInstance.topic().then(function (topic) {
                    $('#registerContent').show();
                    $('#electionTopic').text(topic);
                    $('#yourAddress').text('Your Account\'s address is ' + result[0]);
                  });
                }
              }

            });
          }
        });
      }
    }).catch(function (err) {
    });
  },

  listenForEvents: function () {
    App.contracts.Election.deployed().then(function (instance) {

      instance.voterRegistered({}, {
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function (error, event) {
        if (event.blockNumber != App.latestblock) {
          if (App.latestblock == 0) {
            App.latestblock = event.blockNumber;
          } else {
            App.latestblock += 1;
          }
        } else {
          location.reload();
        }
      });

      instance.voteCasted({}, {
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function (error, event) {
        if (event.blockNumber != App.latestblock) {
          if (App.latestblock == 0) {
            App.latestblock = event.blockNumber;
          } else {
            App.latestblock += 1;
          }
        } else {
          // location.reload();
        }
      });


    });
  }

};

function showCountDown(endTime) {
  var countDownDate = new Date(endTime * 1000);
  var x = setInterval(function () {
    var now = new Date().getTime();
    var distance = countDownDate - now;

    // Time calculations for days, hours, minutes and seconds
    var days = Math.floor(distance / (1000 * 60 * 60 * 24));
    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);
    $('#countDown').text('Election ends in ' + days + "d " + hours + "h " + minutes + "m " + seconds + "s ");

    if (distance < 0) {
      clearInterval(x);
      $('#countDown').text('Time is up');
      location.reload();
    }
  }, 1000);
}


$(function () {
  $(window).load(function () {
    App.init();
  });
});
