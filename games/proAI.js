// ===== 职业AI 第一版 =====

// 职业AI入口
function proAIMove(){

    let move = proSearch();

    if(move){

        play(move[0],move[1]);

    }

}


// 搜索最佳位置
function proSearch(){

    let bestMove=null;
    let bestScore=-999999;


    for(let i=0;i<15;i++){

        for(let j=0;j<15;j++){

            if(board[i][j]==0){


                let score=0;


                // 模拟AI落子
                board[i][j]=2;


                // 进攻评分
                score += evaluatePoint(i,j,2);


                // 恢复
                board[i][j]=0;



                // 模拟玩家落子
                board[i][j]=1;


                // 防守评分
                score += evaluatePoint(i,j,1)*1.2;


                board[i][j]=0;



                if(score>bestScore){

                    bestScore=score;

                    bestMove=[i,j];

                }

            }

        }

    }


    return bestMove;

}

// ===== 职业AI第二阶段：未来搜索 =====

function proMinimax(depth,ai){

    if(depth==0){

        return evaluateBoard();

    }


    let best = ai ? -999999 : 999999;


    for(let i=0;i<15;i++){

        for(let j=0;j<15;j++){


            if(board[i][j]==0){


                board[i][j]=ai?2:1;


                let score=proMinimax(depth-1,!ai);


                board[i][j]=0;



                if(ai){

                    if(score>best){

                        best=score;

                    }

                }
                else{

                    if(score<best){

                        best=score;

                    }

                }


            }


        }

    }


    return best;

}
