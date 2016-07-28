//TargetVerseDisplay.js//

const api = window.ModuleApi;
const React = api.React;
const ReactBootstrap = api.ReactBootstrap;

const Well = ReactBootstrap.Well;

/* Contains a word from the target language, defines a lot of listeners for clicks */
const TargetWord = React.createClass({
// highlighted: false,
  getInitialState: function() {
    return {
      highlighted: false,
      wordObj: { // this is required to pass into our callbacks
        'word': this.props.word,
        'key': this.props.keyId
      }
    };
  },

  userClick: function() {
  // toggles the internal state and changes the actual style of the element
    this.toggleHighlight();
  },

  removeHighlight: function() {
    if (this.state.highlighted) {
      this.setState({
        highlighted: false
      });
    }
  },

  componentWillReceiveProps: function(nextProps) {
    this.setState({
      wordObj: {
        'word': nextProps.word,
        'key': this.props.keyId
      }
    });
  },

  toggleHighlight: function() {
    if (!this.state.highlighted) {
      this.props.selectCallback(this.state.wordObj);
    }
    else {
      this.props.removeCallback(this.state.wordObj);
    }
    this.setState({highlighted: !this.state.highlighted}); // this sets React to re-render the component
  },

  render: function() {

    return (
      <span
        className={this.state.highlighted ? 'text-primary' : 'text-muted'}
        onClick={this.userClick}
        style={this.props.style}
      >
        {this.props.word}
      </span>
      );
    }
});

const TargetLanguageSelectBox = React.createClass({
  selectedWords: [], // holds wordObjects, each have {'word', 'key'} attributes

  cursorPointerStyle: {
    cursor: 'pointer'
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    for (key in this.refs)
      this.refs[key].removeHighlight();
    this.selectedWords = [];
    return true;
  },

  render: function() {
    // populate an array with html elements then return the array
    var wordArray = this.props.verse.split(' ');
    var words = [];
    //This is used for react in mounting components within in an array
    var tokenKey = 0;
    /* This is used for just only words, not spaces, so that we can know where the word is
     * located within the target verse
     */
    var wordKey = 0;
    for (var i = 0; i < wordArray.length; i++) {
      var targetWordComponent = <TargetWord
                                  selectCallback={this.addSelectedWord}
                                  removeCallback={this.removeFromSelectedWords}
                                  key={tokenKey++} 
                                  keyId={wordKey++} 
                                  style={this.cursorPointerStyle}
                                  word={wordArray[i]}
                                  ref={wordKey.toString()}
                                />
      words.push(targetWordComponent);
      if (i != wordArray.length - 1) { // add a space if we're not at the end of the line
        words.push(
          <span
            key={tokenKey++}
          >
            {' '}
          </span>
        ); // even the spaces need keys! (but not keyId)
      }
    }
    // for (var key in this.refs) {
    //   this.refs[key].removeHighlight();
    // }
    return (
      <Well 
        bsSize={'small'}
        style={{
          overflowY: "scroll"
        }}
      >
        <span>{words}</span>
      </Well>
    );
  },

  addSelectedWord: function(wordObj) {
    // check to see if we already have this word
    // an inefficient search, but shouldn't have >10 words to search through
    var idFound = false;
    for (var i = 0; i < this.selectedWords.length; i++) {
      if (this.selectedWords[i].key == wordObj.key) {
        idFound = true;
      }
    }
    if (!idFound) {
      this.selectedWords.push(wordObj);
      this.sortSelectedWords();
    }

    if (this.selectedWords.length > 0) {
      this.props.buttonEnableCallback();
    }
  },

  removeFromSelectedWords: function(wordObj) {
  // get the word's index
    var index = -1;
    for (var i = 0; i < this.selectedWords.length; i++) {
      if (this.selectedWords[i].key == wordObj.key) {
        index = i;
      }
    }
    if (index != -1) {
      this.selectedWords.splice(index, 1);
    }

    if (this.selectedWords.length <= 0) {
      this.props.buttonDisableCallback();
    }
  },

/* Sorts the selected words by their 'key' attribute */
  sortSelectedWords: function() {
    this.selectedWords.sort(function(first, next) {
      return first.key - next.key;
    });
  },

  /**
   * @description - This returns the currently selected words, but formats in 
   * an array with adjacent words concatenated into one string
   */
  getWords: function() {
    var lastKey = -100;
    var returnArray = [];
    for (var wordObj of this.selectedWords){
      if (lastKey < wordObj.key - 1) {
        returnArray.push(wordObj.word);
        lastKey = wordObj.key
      }
      else if (lastKey == wordObj.key - 1) {
        var lastWord = returnArray.pop();
        lastWord += ' ' + wordObj.word;
        returnArray.push(lastWord);
        lastKey = wordObj.key
      }
    }
    return returnArray;
  }
});

module.exports = TargetLanguageSelectBox;